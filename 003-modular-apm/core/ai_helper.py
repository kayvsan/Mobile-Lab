"""AI Helper for self-healing features (Popup & XPath)"""
import os
import re
import json
import xml.etree.ElementTree as ET
import time
import requests
from typing import Optional, Dict, Any
from .logger import get_logger
from .healing_config import HEALING_CONFIG

logger = get_logger("ai_helper")

def minify_xml(xml_str: str, max_chars: int = 40000) -> str:
    if not xml_str:
        return ""
    try:
        # Some dumps have parsing issues, try to encode properly
        root = ET.fromstring(xml_str.encode("utf-8"))
        noisy_attrs = [
            "checkable", "checked", "enabled", "focusable", "focused",
            "scrollable", "long-clickable", "password", "selected",
            "drawing-order", "display-id", "hint", "NAF"
        ]
        
        def clean_node(node):
            for attr in noisy_attrs:
                if attr in node.attrib:
                    del node.attrib[attr]
            
            empty_keys = [k for k, v in node.attrib.items() if v == "" and k not in ["class", "resource-id", "content-desc", "text"]]
            for k in empty_keys:
                del node.attrib[k]
                
            for child in node:
                clean_node(child)
        
        clean_node(root)
        minified = ET.tostring(root, encoding="unicode")
        return minified
    except Exception as e:
        logger.warning(f"Failed to minify XML via parser, using regex: {e}")
        noisy_attrs_re = [
            r'\s*checkable="(true|false)"', r'\s*checked="(true|false)"', r'\s*enabled="(true|false)"',
            r'\s*focusable="(true|false)"', r'\s*focused="(true|false)"', r'\s*scrollable="(true|false)"',
            r'\s*long-clickable="(true|false)"', r'\s*password="(true|false)"', r'\s*selected="(true|false)"',
            r'\s*drawing-order="\d+"', r'\s*display-id="\d+"', r'\s*hint=""', r'\s*NAF="(true|false)"'
        ]
        minified = xml_str
        for attr in noisy_attrs_re:
            minified = re.sub(attr, '', minified)
        minified = os.linesep.join([s for s in minified.splitlines() if s.strip()])
        if len(minified) > max_chars:
            minified = minified[:max_chars] + "\n... [TRUNCATED]"
        return minified

def _call_llm(prompt: str, response_format: str = "text", max_retries: int = 3, prefix_log: str = "[AI]") -> Optional[str]:
    api_key = HEALING_CONFIG.get("ai_api_key")
    if not api_key:
        logger.error(f"{prefix_log} API_KEY is not set in HEALING_CONFIG.")
        return None

    url = f"{HEALING_CONFIG.get('ai_api_url', 'https://ai.sumopod.com/v1').rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    for api_attempt in range(max_retries):
        try:
            logger.info(f"{prefix_log} Prompt size: {len(prompt)} chars. Sending (Attempt {api_attempt+1}/{max_retries})...")
            
            payload = {
                "model": HEALING_CONFIG.get("ai_model", "deepseek-v4-flash"),
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 2048,
                "temperature": 0.2
            }
            
            if response_format == "json_object":
                payload["response_format"] = {"type": "json_object"}
            
            start_time = time.time()
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            end_time = time.time()
            data = response.json()
            response_text = data['choices'][0]['message']['content'].strip()
            
            logger.info(f"{prefix_log} Response received in {end_time - start_time:.2f}s")
            logger.debug(f"{prefix_log} Response: {response_text}")
            
            return response_text
        except Exception as e:
            logger.warning(f"{prefix_log} API error on attempt {api_attempt+1}: {e}")
            if api_attempt < max_retries - 1:
                time.sleep(2)
            else:
                logger.error(f"{prefix_log} All LLM retries failed.")
                return None

def get_xpath_suggestion(xml_dump: str, main_xpath: str, app_package: str, max_retries: int = 3) -> Optional[str]:
    """Phase 1b: Suggest popup closer"""
    minified_xml = minify_xml(xml_dump)
    prompt = f"""
I am automating an Android app ('{app_package}'). My automation is trying to find the element with xpath: `{main_xpath}`.
However, it cannot be found. There might be a popup, ad, or dialog blocking the screen.

Here is the current UI XML dump:
```xml
{minified_xml}
```

Please analyze the XML and find the most likely "Close" button for the popup/ad (e.g., an element with resource-id containing 'close', content-desc='close', text='X', or a close icon).
Respond ONLY with the exact XPath string to click to close this popup. If there is no popup, respond with 'NONE'. Do not include markdown formatting or explanations.
"""
    return _call_llm(prompt, response_format="text", max_retries=max_retries, prefix_log="[AI-Popup]")

def get_healed_xpath(xml_dump: str, expected_props: dict, app_package: str, max_retries: int = 3) -> Optional[Dict[str, Any]]:
    """Phase 2c: Suggest replacement xpath for stale element"""
    minified_xml = minify_xml(xml_dump)
    prompt = f"""
I am automating an Android app ('{app_package}'). The target element could not be found, likely due to an app update changing the UI hierarchy or resource IDs.

Here are the expected properties of the element from a past successful run:
```json
{json.dumps(expected_props, indent=2)}
```

Here is the CURRENT UI XML dump:
```xml
{minified_xml}
```

Please find the best matching element in the current XML that corresponds to the expected element.
Respond with a JSON object containing:
- 'new_xpath': The new robust XPath to find the element.
- 'confidence': A number from 0.0 to 1.0 indicating your confidence.
- 'reason': A brief explanation of why this is the correct element.
"""
    response_text = _call_llm(prompt, response_format="json_object", max_retries=max_retries, prefix_log="[AI-Heal]")
    if not response_text:
        return None
    
    try:
        if response_text.startswith("```json"):
            response_text = response_text[7:-3].strip()
        elif response_text.startswith("```"):
            response_text = response_text[3:-3].strip()
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.error(f"[AI-Heal] Failed to parse JSON response: {e}")
        return None
