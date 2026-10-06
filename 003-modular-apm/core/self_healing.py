"""Self-healing engine for Android automation"""
import time
from typing import Dict, Any, Optional

from core.logger import get_logger
from core.healing_config import HEALING_CONFIG

logger = get_logger("self_healing")

class SelfHealingEngine:
    def __init__(self, device_manager):
        self.device = device_manager
        self.config = HEALING_CONFIG

    def execute_with_healing(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Attempt to heal an element that was not found.
        Returns a dict with 'success', and potentially 'new_xpath' if healed.
        """
        if not self.config.get("enabled", True):
            return {"success": False, "error": "Healing disabled"}

        find_by = task.get('find_by', 'xpath')
        content = task.get('content', '')
        
        # Currently we only support healing for xpath
        if find_by != 'xpath':
            return {"success": False, "error": f"Cannot heal find_by type: {find_by}"}

        logger.info(f"[HEAL] Starting healing pipeline for: {task.get('element_name', content[:30])}")

        # Phase 0: Scroll Healing
        # if self._find_with_scroll(content):
        #     logger.info("[HEAL-SCROLL] Element found after scrolling!")
        #     return {"success": True, "new_xpath": content, "method": "scroll"}
            
        # Phase 1a: Local Popup Close
        if self._try_local_popup_fallbacks(task, content):
            logger.info("[HEAL-POPUP] Element found after closing popup locally!")
            return {"success": True, "new_xpath": content, "method": "local_popup"}
            
        # Phase 1b: AI Popup Healing
        if self._try_ai_popup_healing(task, content):
            logger.info("[HEAL-POPUP-AI] Element found after closing popup via AI!")
            return {"success": True, "new_xpath": content, "method": "ai_popup"}

        # Phase 2a: Local Pattern Match
        healed_xpath = self._try_local_xpath_variants(task, content)
        if healed_xpath:
            logger.info("[HEAL-XPATH] Element found using local fingerprint variants!")
            self._persist_healed_xpath(task, content, healed_xpath)
            return {"success": True, "new_xpath": healed_xpath, "method": "local_xpath"}
            
        # Phase 2b: Cached XPath Check
        healed_xpath = self._try_cached_healed_xpaths(task)
        if healed_xpath:
            logger.info("[HEAL-XPATH] Element found using cached healed xpath!")
            return {"success": True, "new_xpath": healed_xpath, "method": "cached_xpath"}
            
        # Phase 2c: AI XPath Healing
        healed_xpath = self._heal_stale_xpath(task, content)
        if healed_xpath:
            logger.info("[HEAL-XPATH-AI] Element healed successfully via AI!")
            self._persist_healed_xpath(task, content, healed_xpath)
            return {"success": True, "new_xpath": healed_xpath, "method": "ai_xpath"}

        logger.warning("[HEAL] All healing phases failed.")
        return {"success": False, "error": "All healing phases failed"}

    def _find_with_scroll(self, xpath: str) -> bool:
        """Phase 0: Scroll up/down to find element off-viewport"""
        max_scrolls = self.config.get("max_scroll_attempts", 3)
        
        # Scroll Down (to see elements below)
        for i in range(max_scrolls):
            logger.debug(f"[HEAL-SCROLL] Scrolling DOWN {i+1}/{max_scrolls}...")
            # To see elements below, we swipe UP
            self.device.swipe_ext("up", scale=0.6)
            time.sleep(1)
            selector = self.device.find_element('xpath', xpath, timeout=2)
            if selector:
                return True
                
        # Scroll back to top
        for _ in range(max_scrolls):
            self.device.swipe_ext("down", scale=0.6)
            time.sleep(0.5)
            
        # Scroll Up (to see elements above)
        for i in range(max_scrolls):
            logger.debug(f"[HEAL-SCROLL] Scrolling UP {i+1}/{max_scrolls}...")
            # To see elements above, we swipe DOWN
            self.device.swipe_ext("down", scale=0.6)
            time.sleep(1)
            selector = self.device.find_element('xpath', xpath, timeout=2)
            if selector:
                return True
                
        return False

    def _try_local_popup_fallbacks(self, task: Dict[str, Any], main_xpath: str) -> bool:
        """Phase 1a: Try closing popup using known xpaths"""
        logger.info("[HEAL-POPUP] Attempting predefined and learned popup closers...")
        
        candidates = list(self.config.get("predefined_close_xpaths", []))
        learned = task.get("extra", {}).get("learned_xpaths", [])
        
        # Put learned xpaths first
        candidates = learned + [x for x in candidates if x not in learned]
        
        for idx, xpath in enumerate(candidates):
            logger.debug(f"[HEAL-POPUP] Trying closer {idx+1}/{len(candidates)}: {xpath}")
            closer_el = self.device.find_element('xpath', xpath, timeout=2)
            if closer_el:
                logger.info(f"[HEAL-POPUP] Found potential closer: {xpath}, tapping...")
                self.device.tap_element(closer_el)
                time.sleep(2)
                
                # Check if main element is now visible
                if self.device.find_element('xpath', main_xpath, timeout=3):
                    self._save_learned_popup_xpath(task, xpath)
                    return True
        return False

    def _try_ai_popup_healing(self, task: Dict[str, Any], main_xpath: str) -> bool:
        """Phase 1b: Ask AI to find a popup closer"""
        from core.ai_helper import get_xpath_suggestion
        
        logger.info("[HEAL-POPUP-AI] Asking LLM to find popup closer...")
        xml_dump = self.device.dump_hierarchy()
        app_package = self.device.get_current_package()
        
        max_retries = self.config.get("max_ai_retries", 3)
        suggestion = get_xpath_suggestion(xml_dump, main_xpath, app_package, max_retries)
        
        if not suggestion or suggestion.strip().upper() == "NONE":
            logger.info("[HEAL-POPUP-AI] AI found no popup closer.")
            return False
            
        logger.info(f"[HEAL-POPUP-AI] AI suggested closer: {suggestion}")
        closer_el = self.device.find_element('xpath', suggestion, timeout=3)
        
        if closer_el:
            logger.info("[HEAL-POPUP-AI] Suggested closer found on screen, tapping...")
            self.device.tap_element(closer_el)
            time.sleep(2)
            
            # Check if main element is now visible
            if self.device.find_element('xpath', main_xpath, timeout=3):
                self._save_learned_popup_xpath(task, suggestion)
                return True
                
        logger.info("[HEAL-POPUP-AI] AI suggestion failed to resolve the issue.")
        return False

    def _save_learned_popup_xpath(self, task: Dict[str, Any], xpath: str):
        """Save successful popup closer to task extra"""
        if "extra" not in task:
            task["extra"] = {}
        if "learned_xpaths" not in task["extra"]:
            task["extra"]["learned_xpaths"] = []
            
        if xpath not in task["extra"]["learned_xpaths"]:
            task["extra"]["learned_xpaths"].append(xpath)
            # Mark for backend sync later
            self._healing_dirty = True
            logger.debug(f"[HEAL-POPUP] Saved learned closer: {xpath}")

    def record_success(self, task: Dict[str, Any], selector: Any):
        """Called when an element is found successfully. Used to refresh baseline/fingerprint."""
        if not self.config.get("enabled", True) or task.get("find_by") != "xpath":
            return
            
        # Refresh baseline based on interval
        interval = self.config.get("baseline_refresh_interval", 5)
        run_count = task.get("extra", {}).get("_success_count", 0) + 1
        
        if "extra" not in task:
            task["extra"] = {}
        task["extra"]["_success_count"] = run_count
        
        if run_count == 1 or run_count % interval == 0:
            logger.debug(f"[HEAL-BASE] Recording baseline for {task.get('element_name', task.get('content'))[:30]}")
            self._extract_fingerprint(task, selector)

    def _extract_fingerprint(self, task: Dict[str, Any], selector: Any):
        """Extract properties from found element for future local healing"""
        try:
            info = selector.info
            fingerprint = {
                "text": info.get("text", ""),
                "resource-id": info.get("resourceName", ""),
                "content-desc": info.get("contentDescription", ""),
                "class": info.get("className", ""),
                "package": info.get("packageName", "")
            }
            # Only keep non-empty values
            fingerprint = {k: v for k, v in fingerprint.items() if v}
            
            if "extra" not in task:
                task["extra"] = {}
            task["extra"]["expected"] = fingerprint
            self._healing_dirty = True
        except Exception as e:
            logger.debug(f"[HEAL-BASE] Failed to extract fingerprint: {e}")

    def _try_local_xpath_variants(self, task: Dict[str, Any], main_xpath: str) -> Optional[str]:
        """Phase 2a: Try finding element using fingerprint variants without AI"""
        expected = task.get("extra", {}).get("expected", {})
        if not expected:
            return None
            
        logger.info("[HEAL-XPATH] Attempting local pattern matching from fingerprint...")
        variants = []
        
        # Exact matches
        if expected.get("text"):
            variants.append(f"//*[@text='{expected['text']}']")
        if expected.get("content-desc"):
            variants.append(f"//*[@content-desc='{expected['content-desc']}']")
        if expected.get("resource-id"):
            variants.append(f"//*[@resource-id='{expected['resource-id']}']")
            
        # Partial matches
        if expected.get("resource-id"):
            id_part = expected["resource-id"].split("/")[-1] if "/" in expected["resource-id"] else expected["resource-id"]
            variants.append(f"//*[contains(@resource-id, '{id_part}')]")
            
        # Combinations
        if expected.get("class") and expected.get("text"):
            variants.append(f"//{expected['class']}[@text='{expected['text']}']")
            
        # Deduplicate while preserving order
        seen = set()
        variants = [x for x in variants if not (x in seen or seen.add(x))]
        
        for variant in variants:
            if variant == main_xpath:
                continue
            logger.debug(f"[HEAL-XPATH] Trying variant: {variant}")
            if self.device.find_element('xpath', variant, timeout=2):
                return variant
                
        return None

    def _try_cached_healed_xpaths(self, task: Dict[str, Any]) -> Optional[str]:
        """Phase 2b: Try previously successful AI-healed xpaths"""
        healed_xpaths = task.get("extra", {}).get("learned_healed_xpaths", [])
        if not healed_xpaths:
            return None
            
        logger.info("[HEAL-XPATH] Checking previously healed xpaths...")
        for xpath in healed_xpaths:
            logger.debug(f"[HEAL-XPATH] Trying cached xpath: {xpath}")
            if self.device.find_element('xpath', xpath, timeout=2):
                return xpath
        return None

    def _heal_stale_xpath(self, task: Dict[str, Any], main_xpath: str) -> Optional[str]:
        """Phase 2c: Ask AI to find replacement xpath"""
        expected = task.get("extra", {}).get("expected", {})
        if not expected:
            element_name = task.get("element_name")
            if element_name:
                logger.info(f"[HEAL-XPATH-AI] No 'expected' data found, falling back to element_name: '{element_name}'")
                expected = {"name_or_description": element_name}
            else:
                logger.warning("[HEAL-XPATH-AI] No fingerprint ('expected' data) or 'element_name' available for AI healing.")
                return None
            
        from core.ai_helper import get_healed_xpath
        
        logger.info("[HEAL-XPATH-AI] Asking LLM for replacement xpath...")
        xml_dump = self.device.dump_hierarchy()
        app_package = self.device.get_current_package()
        
        max_retries = self.config.get("max_ai_retries", 3)
        result = get_healed_xpath(xml_dump, expected, app_package, max_retries)
        
        if not result or not result.get("new_xpath"):
            logger.info("[HEAL-XPATH-AI] AI failed to suggest a replacement xpath.")
            return None
            
        new_xpath = result["new_xpath"]
        confidence = float(result.get("confidence", 0.0))
        reason = result.get("reason", "")
        
        threshold = self.config.get("ai_confidence_threshold", 0.85)
        logger.info(f"[HEAL-XPATH-AI] AI suggested: {new_xpath} (Confidence: {confidence}) - {reason}")
        
        if confidence < threshold:
            logger.warning(f"[HEAL-XPATH-AI] Confidence {confidence} below threshold {threshold}. Rejecting.")
            return None
            
        if self.device.find_element('xpath', new_xpath, timeout=3):
            return new_xpath
            
        logger.info("[HEAL-XPATH-AI] AI suggested xpath not found on screen.")
        return None

    def _persist_healed_xpath(self, task: Dict[str, Any], old_xpath: str, new_xpath: str):
        """Save successfully healed xpath to task data"""
        if "extra" not in task:
            task["extra"] = {}
            
        # Save to history
        if "xpath_history" not in task["extra"]:
            task["extra"]["xpath_history"] = []
        task["extra"]["xpath_history"].append({
            "from": old_xpath,
            "to": new_xpath,
            "timestamp": time.time()
        })
        
        # Save to cached healed
        if "learned_healed_xpaths" not in task["extra"]:
            task["extra"]["learned_healed_xpaths"] = []
        if new_xpath not in task["extra"]["learned_healed_xpaths"]:
            task["extra"]["learned_healed_xpaths"].append(new_xpath)
            
        # Update actual task content so future executions in this run use it
        task["content"] = new_xpath
        task["_healed_xpath"] = new_xpath
        self._healing_dirty = True
        logger.info(f"[HEAL-XPATH] Successfully persisted new xpath: {new_xpath}")
