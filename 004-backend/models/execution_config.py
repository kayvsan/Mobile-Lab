"""ExecutionConfig model — saved automation configurations"""
import json
import uuid
from datetime import datetime, timezone
from . import db


class ExecutionConfig(db.Model):
    __tablename__ = 'execution_configs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    device_id = db.Column(db.String(36), db.ForeignKey('devices.id'), nullable=False)
    journey_ids = db.Column(db.Text, nullable=False)  # JSON array of journey IDs (ordered)
    cycles = db.Column(db.Integer, default=1)
    interval = db.Column(db.Integer, default=0)  # seconds between journeys
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)

    # Link to currently running execution (null when idle)
    active_execution_id = db.Column(db.String(36), db.ForeignKey('executions.id'), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    device = db.relationship('Device', backref='execution_configs', lazy='joined')
    active_execution = db.relationship('Execution', foreign_keys=[active_execution_id], lazy='joined')

    def get_journey_ids(self):
        try:
            return json.loads(self.journey_ids) if self.journey_ids else []
        except (json.JSONDecodeError, TypeError):
            return []

    def set_journey_ids(self, ids_list):
        self.journey_ids = json.dumps(ids_list)

    def to_dict(self):
        exec_status = None
        exec_started_at = None
        if self.active_execution:
            exec_status = self.active_execution.status
            exec_started_at = self.active_execution.started_at.isoformat() if self.active_execution.started_at else None
            # Clear stale link if execution is finished
            if exec_status in ('completed', 'failed', 'cancelled'):
                exec_status = None
                exec_started_at = None

        return {
            "id": self.id,
            "name": self.name,
            "device_id": self.device_id,
            "device_name": self.device.name if self.device else None,
            "journey_ids": self.get_journey_ids(),
            "cycles": self.cycles,
            "interval": self.interval,
            "user_id": self.user_id,
            "active_execution_id": self.active_execution_id if exec_status else None,
            "execution_status": exec_status,
            "execution_started_at": exec_started_at,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
