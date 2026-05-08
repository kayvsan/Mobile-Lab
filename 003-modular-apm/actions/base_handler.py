"""Base handler class for all action types"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import time

from core.logger import get_logger


class BaseHandler(ABC):
    """Abstract base class for task handlers"""
    
    def __init__(self, device_manager):
        self.device = device_manager
        self.logger = get_logger(self.__class__.__name__)
        self._wait_applied = 0.0
    
    @abstractmethod
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the task"""
        pass
    
    def _wait(self, seconds: float):
        """Wait with tracking"""
        if seconds > 0:
            time.sleep(seconds)
            self._wait_applied += float(seconds)
            
    def _get_result(self, success: bool, error: Optional[str] = None, data: Any = None) -> Dict[str, Any]:
        """Format handler result"""
        return {
            'success': success,
            'error': error,
            'data': data,
            'wait_applied': self._wait_applied
        }
