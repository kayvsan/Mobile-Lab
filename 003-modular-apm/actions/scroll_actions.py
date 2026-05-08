"""Handler for scroll and swipe actions"""
from typing import Dict, Any
from .base_handler import BaseHandler


class ScrollActionHandler(BaseHandler):
    """Handles 'scroll', 'swipe', and 'scroll_with_timing' task types"""
    
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        task_type = task.get('type')
        
        if task_type in ('scroll', 'scroll_with_timing'):
            return self._handle_scroll(task, context)
        elif task_type == 'swipe':
            return self._handle_swipe(task)
            
        return self._get_result(False, f"Unsupported scroll type: {task_type}")

    def _handle_scroll(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        direction = task.get('direction', 'up')
        scale = float(task.get('scale', 0.6))
        wait_after = float(task.get('wait_after', task.get('wait', 1.0)))
        
        # Tracking scroll count in context
        scroll_count = context.get('_scroll_count', 0) + 1
        context['_scroll_count'] = scroll_count
        
        self.logger.info(f"Scroll #{scroll_count}: {direction} (scale={scale})")
        success = self.device.swipe_ext(direction, scale=scale)
        
        if wait_after > 0:
            self._wait(wait_after)
            
        return self._get_result(success, None if success else "Scroll failed")

    def _handle_swipe(self, task: Dict[str, Any]) -> Dict[str, Any]:
        # Basic implementation using d.swipe could be added if needed
        # For now, scroll is what matters for the provided journey
        return self._get_result(False, "Swipe not implemented yet")
