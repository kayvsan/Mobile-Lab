"""Handler for coordinate-based tap actions"""
from typing import Dict, Any
from .base_handler import BaseHandler


class TapCoordsActionHandler(BaseHandler):
    """Handles 'tap_coords' task type"""
    
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        try:
            x = int(task.get('x', 0))
            y = int(task.get('y', 0))
            
            self.logger.info(f"Tapping coordinates: ({x}, {y})")
            success = self.device.tap_coordinates(x, y)
            
            wait_after = float(task.get('wait', 0))
            if wait_after > 0:
                self._wait(wait_after)
                
            return self._get_result(success, None if success else "Coordinate tap failed")
        except Exception as e:
            return self._get_result(False, f"Invalid coordinates or tap error: {e}")
