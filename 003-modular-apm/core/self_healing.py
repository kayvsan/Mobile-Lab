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
        if self._find_with_scroll(content):
            logger.info("[HEAL-SCROLL] Element found after scrolling!")
            return {"success": True, "new_xpath": content, "method": "scroll"}
            
        # Phase 1a: Local Popup Close
        if self._try_local_popup_fallbacks(task, content):
            logger.info("[HEAL-POPUP] Element found after closing popup locally!")
            return {"success": True, "new_xpath": content, "method": "local_popup"}
            
        # Phase 1b: AI Popup Healing
        if self._try_ai_popup_healing(task, content):
            logger.info("[HEAL-POPUP-AI] Element found after closing popup via AI!")
            return {"success": True, "new_xpath": content, "method": "ai_popup"}

        logger.warning("[HEAL] Element not found after Phase 1. Further phases not yet implemented.")
        return {"success": False, "error": "Element not found after popup healing"}

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
