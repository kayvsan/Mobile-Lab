"""Task data models"""
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime


@dataclass
class TaskResult:
    """Result of a task execution"""
    task_id: str
    task_name: str
    success: bool
    error: Optional[str] = None
    duration_seconds: float = 0.0
    response_time: Optional[float] = None
    measured: bool = False
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/export"""
        return {
            "task_id": self.task_id,
            "task_name": self.task_name,
            "success": self.success,
            "error": self.error,
            "duration_seconds": round(self.duration_seconds, 2),
            "response_time": self.response_time,
            "measured": self.measured,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }


@dataclass
class Task:
    """Task definition from journey JSON"""
    id: str
    name: str
    type: str
    
    # UI-related fields
    action: str = "none"
    find_by: str = "xpath"
    content: str = ""
    element_name: str = ""
    input: str = ""
    
    # Coordinate fields
    x: Optional[int] = None
    y: Optional[int] = None
    
    # Timing & behavior
    timeout: int = 30
    wait: int = 0
    handler: str = "uiauto2"
    condition: Optional[str] = None
    critical: bool = True
    
    # Navigation limit for back_until_ui
    max_presses: Optional[int] = None
    
    # Response time measurement
    measure_response_time: bool = False
    
    # Network recording (Legacy compatibility)
    record_param: bool = False
    record_param_when: str = "after_action"
    
    # Extra fields for custom task types
    extra: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """Create Task instance from dictionary"""
        known_fields = {
            'id', 'name', 'type', 'action', 'find_by', 'content', 
            'element_name', 'input', 'x', 'y', 'timeout', 'wait', 
            'handler', 'condition', 'critical', 'measure_response_time', 
            'max_presses', 'record_param', 'record_param_when'
        }
        
        task_data = {k: v for k, v in data.items() if k in known_fields}
        extra_data = {k: v for k, v in data.items() if k not in known_fields}
        
        # Type conversion for x/y
        if 'x' in task_data and task_data['x'] is not None:
            task_data['x'] = int(float(str(task_data['x'])))
        if 'y' in task_data and task_data['y'] is not None:
            task_data['y'] = int(float(str(task_data['y'])))
        
        task = cls(**task_data)
        task.extra = extra_data
        
        return task

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        result = {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "action": self.action,
            "find_by": self.find_by,
            "content": self.content,
            "element_name": self.element_name,
            "input": self.input,
            "x": self.x,
            "y": self.y,
            "timeout": self.timeout,
            "wait": self.wait,
            "handler": self.handler,
            "condition": self.condition,
            "critical": self.critical,
            "measure_response_time": self.measure_response_time,
            "max_presses": self.max_presses,
            "record_param": self.record_param,
            "record_param_when": self.record_param_when,
            "extra": self.extra,
        }
        return {k: v for k, v in result.items() if v is not None}
