"""Flow control action handlers"""
import time
from typing import Dict, Any
from .base_handler import BaseHandler


class FlowTaskHandler(BaseHandler):
    """Handles 'do_if_ui', 'back_until_ui', and 'do_while_ui' task types"""
    
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        task_type = task.get('type')
        
        if task_type == 'do_if_ui':
            return self._handle_do_if_ui(task)
        elif task_type == 'back_until_ui':
            return self._handle_back_until_ui(task)
        elif task_type == 'do_while_ui':
            return self._handle_do_while_ui(task)
            
        return self._get_result(False, f"Unsupported task type: {task_type}")

    def _handle_do_if_ui(self, task: Dict[str, Any]) -> Dict[str, Any]:
        find_by = task.get('find_by', 'xpath')
        content = task.get('content', '')
        timeout = int(task.get('timeout', 5))
        
        selector = self.device.find_element(find_by, content, timeout)
        if selector:
            self.logger.info(f"Element '{task.get('element_name')}' found, performing action")
            return self._perform_simple_action(task, selector)
        else:
            self.logger.info(f"Element '{task.get('element_name')}' not found, skipping silently")
            return self._get_result(True, data={'skipped': True})

    def _handle_back_until_ui(self, task: Dict[str, Any]) -> Dict[str, Any]:
        find_by = task.get('find_by', 'xpath')
        content = task.get('content', '')
        timeout = int(task.get('timeout', 30))
        max_presses = int(task.get('max_presses', 5))
        
        start_time = time.time()
        press_count = 0
        
        while (time.time() - start_time) < timeout and press_count < max_presses:
            selector = self.device.find_element(find_by, content, 2)
            if selector:
                self.logger.info(f"Target UI '{task.get('element_name')}' found after {press_count} back presses")
                return self._get_result(True)
            
            self.logger.info(f"[BACK {press_count + 1}/{max_presses}] Target UI not found, pressing BACK")
            self.device.press_back()
            press_count += 1
            time.sleep(1)
            
        return self._get_result(False, "Target UI not found within back limit/timeout")

    def _handle_do_while_ui(self, task: Dict[str, Any]) -> Dict[str, Any]:
        find_by = task.get('find_by', 'xpath')
        content = task.get('content', '')
        timeout = int(task.get('timeout', 60))
        
        start_time = time.time()
        loop_count = 0
        while (time.time() - start_time) < timeout:
            loop_count += 1
            selector = self.device.find_element(find_by, content, 2)
            if not selector:
                self.logger.info(f"UI '{task.get('element_name')}' disappeared after {loop_count} iterations, loop finished")
                return self._get_result(True)
            
            self.logger.info(f"[LOOP {loop_count}] Element '{task.get('element_name')}' still present, performing action")
            self._perform_simple_action(task, selector)
            time.sleep(1)
            
        return self._get_result(False, "Loop timeout")

    def _perform_simple_action(self, task: Dict[str, Any], selector) -> Dict[str, Any]:
        action = task.get('action', 'none')
        if action == 'tap':
            self.device.tap_element(selector)
        elif action == 'input':
            self.device.tap_element(selector)
            time.sleep(0.5)
            self.device.send_keys(task.get('input', ''))
        return self._get_result(True)
