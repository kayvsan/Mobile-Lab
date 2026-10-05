"""Journey data models"""
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
import json
from pathlib import Path

from .task import Task


@dataclass
class JourneyDetail:
    """A sub journey within a journey containing multiple tasks"""
    id: str
    name: str
    tasks: List[Task]
    measure_response_time: bool = True
    condition: Optional[str] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'JourneyDetail':
        """Create JourneyDetail from dictionary"""
        tasks = [Task.from_dict(t) for t in data.get('tasks', [])]
        return cls(
            id=data.get('id', ''),
            name=data.get('name', ''),
            tasks=tasks,
            measure_response_time=data.get('measure_response_time', True),
            condition=data.get('condition')
        )
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        result = {
            "id": self.id,
            "name": self.name,
            "tasks": [t.to_dict() for t in self.tasks],
            "measure_response_time": self.measure_response_time,
            "condition": self.condition
        }
        return {k: v for k, v in result.items() if v is not None}


@dataclass
class Journey:
    """Main journey definition"""
    id: str
    name: str
    platform: str = "android"
    package: str = ""
    activity: str = ""
    journey_type: str = "independent"
    condition: Optional[str] = None
    details: List[JourneyDetail] = field(default_factory=list)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Journey':
        """Create Journey from dictionary"""
        details = [JourneyDetail.from_dict(d) for d in data.get('details', [])]
        return cls(
            id=data.get('id', ''),
            name=data.get('name', ''),
            platform=data.get('platform', 'android'),
            package=data.get('package', ''),
            activity=data.get('activity', ''),
            journey_type=data.get('type', 'independent'),
            condition=data.get('condition'),
            details=details
        )
    
    @classmethod
    def from_file(cls, filepath: str) -> tuple:
        """
        Load journey from JSON file
        Returns: Tuple of (Journey instance, any_param dict)
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        journey = cls.from_dict(data.get('journey', {}))
        any_param = data.get('any_param', {})
        return journey, any_param
