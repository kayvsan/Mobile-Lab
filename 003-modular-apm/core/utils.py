"""Utility functions for APM Android Automation"""
import re
import time
import json
from typing import Any, Dict, Optional, Union
from pathlib import Path
from datetime import datetime


def resolve_template(text: str, context: Dict[str, Any]) -> str:
    """
    Resolve {{variable}} or {{object.key}} templates in text
    """
    if not text or "{{" not in str(text):
        return text
    
    def replacer(match):
        key_path = match.group(1).strip()
        keys = key_path.split(".")
        value = context
        
        try:
            for key in keys:
                if isinstance(value, dict):
                    value = value[key]
                else:
                    return match.group(0)
            return str(value) if value is not None else ""
        except (KeyError, TypeError, IndexError):
            return match.group(0)
    
    if isinstance(text, str):
        return re.sub(r'\{\{([^}]+)\}\}', replacer, text)
    return text


def resolve_object(obj: Any, context: Dict[str, Any]) -> Any:
    """
    Recursively resolve templates in any object
    """
    if isinstance(obj, str):
        return resolve_template(obj, context)
    elif isinstance(obj, dict):
        return {
            resolve_template(k, context): resolve_object(v, context)
            for k, v in obj.items()
        }
    elif isinstance(obj, list):
        return [resolve_object(item, context) for item in obj]
    return obj


def check_condition(condition: Optional[str], context: Dict[str, Any]) -> bool:
    """
    Evaluate a condition string safely
    """
    if not condition or not condition.strip():
        return True
    
    try:
        resolved = resolve_template(condition.strip(), context)
        
        if resolved.lower() in ('true', '1', 'yes', 'on'):
            return True
        elif resolved.lower() in ('false', '0', 'no', 'off', ''):
            return False
        
        # Simple logical eval with restricted builtins
        allowed_names = {k: v for k, v in context.items() if not k.startswith('_')}
        return bool(eval(resolved, {"__builtins__": {}}, allowed_names))
    except Exception as e:
        from .logger import get_logger
        get_logger("utils").warning(f"Condition eval failed: {condition} - {e}")
        return True


def load_json_file(filepath: Union[str, Path]) -> Dict:
    """Load and parse JSON file"""
    path = Path(filepath)
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json_file(filepath: Union[str, Path], data: Dict, indent: int = 2):
    """Save data to JSON file"""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)


def generate_timestamp(format_str: str = "%Y%m%d_%H%M%S") -> str:
    """Generate formatted timestamp string"""
    return datetime.now().strftime(format_str)


def calculate_element_center(bounds: Dict[str, int]) -> tuple:
    """Calculate center coordinates from element bounds"""
    x = (bounds["left"] + bounds["right"]) // 2
    y = (bounds["top"] + bounds["bottom"]) // 2
    return x, y
