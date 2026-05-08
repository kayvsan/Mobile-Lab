import time
from typing import Dict, Any
from .base_handler import BaseHandler


class UITaskHandler(BaseHandler):
    """Handles 'ui' and 'within_ui' task types"""
    
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        task_type = task.get('type')
        
        if task_type == 'ui':
            return self._handle_ui(task)
        elif task_type == 'within_ui':
            return self._handle_within_ui(task)
        
        return self._get_result(False, f"Unsupported task type: {task_type}")

    def _handle_ui(self, task: Dict[str, Any]) -> Dict[str, Any]:
        find_by = task.get('find_by', 'xpath')
        content = task.get('content', '')
        timeout = int(task.get('timeout', 30))
        
        element_label = task.get('element_name') or content[:50]
        self.logger.info(f"Finding element: {element_label} (by={find_by}, timeout={timeout}s)")
        selector = self.device.find_element(find_by, content, timeout)
        
        if selector:
            return self._perform_action(task, selector)
        else:
            return self._get_result(False, "Element not found")

    def _handle_within_ui(self, task: Dict[str, Any]) -> Dict[str, Any]:
        find_by = task.get('find_by', 'xpath')
        content = task.get('content', '')  # Can be multiple XPaths separated by newline
        timeout = int(task.get('timeout', 30))
        
        xpaths = content.strip().split('\n')
        start_time = time.time()
        
        while (time.time() - start_time) < timeout:
            for xpath in xpaths:
                selector = self.device.find_element(find_by, xpath, 1) # Short poll
                if selector:
                    return self._perform_action(task, selector)
        
        return self._get_result(False, "None of the elements found within timeout")

    def _perform_action(self, task: Dict[str, Any], selector) -> Dict[str, Any]:
        action = task.get('action', 'none')
        wait_time = int(task.get('wait', 0))
        
        if wait_time > 0:
            self._wait(wait_time)
            
        if action == 'tap':
            success = self.device.tap_element(selector)
            self.logger.info(f"Action 'tap' completed on element: {task.get('element_name', 'N/A')} (success={success})")
            return self._get_result(success, None if success else "Tap failed")
        elif action == 'input':
            handler_type = task.get('handler', 'uiauto2')
            if task.get('content'):
                self.device.tap_element(selector)
                self._wait(0.5)
            
            input_text = str(task.get('input', ''))
            if handler_type in ('system', 'adb'):
                success = self.device.input_via_adb(input_text)
            else:
                success = self.device.send_keys(input_text)
            
            self.logger.info(f"Action 'input' completed on element: {task.get('element_name', 'N/A')} (handler={handler_type}, success={success})")
            return self._get_result(success, None if success else "Input failed")
        elif action == 'none':
            return self._get_result(True)
        
        return self._get_result(False, f"Unsupported action: {action}")
