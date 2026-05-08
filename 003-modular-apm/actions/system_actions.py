"""System and application action handlers"""
import time
from typing import Dict, Any
from .base_handler import BaseHandler


class SystemTaskHandler(BaseHandler):
    """Handles 'app_open', 'app_close', 'app_clear', and 'wait' task types"""
    
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        task_type = task.get('type')
        
        if task_type == 'app_open':
            return self._handle_app_open(task, context)
        elif task_type == 'app_close':
            return self._handle_app_close(task, context)
        elif task_type == 'app_clear':
            return self._handle_app_clear(task, context)
        elif task_type == 'wait':
            return self._handle_wait(task)
            
        return self._get_result(False, f"Unsupported task type: {task_type}")

    def _handle_app_open(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Priority: task content > journey package
        package = task.get('content') or context.get('journey', {}).get('package')
        activity = task.get('activity_name') or context.get('journey', {}).get('activity')
        
        if not package:
            return self._get_result(False, "No package specified for app_open")
            
        self.logger.info(f"[APP] Opening app: {package} (activity={activity or 'default'})")
        success = self.device.app_start(package, activity, use_monkey=True)
        return self._get_result(success, None if success else "Failed to open app")

    def _handle_app_close(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        package = task.get('content') or context.get('journey', {}).get('package')
        if not package:
            return self._get_result(False, "No package specified for app_close")
            
        self.logger.info(f"[APP] Closing app: {package}")
        success = self.device.app_stop(package)
        return self._get_result(success)

    def _handle_app_clear(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        package = task.get('content') or context.get('journey', {}).get('package')
        if not package:
            return self._get_result(False, "No package specified for app_clear")
            
        self.logger.info(f"[APP] Clearing data for app: {package}")
        success = self.device.app_clear(package)
        return self._get_result(success)

    def _handle_wait(self, task: Dict[str, Any]) -> Dict[str, Any]:
        # Check both 'content' and 'wait' fields
        val = task.get('content') or task.get('wait')
        try:
            seconds = float(val) if val is not None and str(val).strip() != "" else 0.0
        except ValueError:
            seconds = 0.0
            
        self.logger.info(f"[WAIT] Pausing for {seconds}s")
        self._wait(seconds)
        return self._get_result(True)
