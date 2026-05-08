"""Execution model — tracks each automation run lifecycle"""
import uuid
from datetime import datetime, timezone
from . import db


class Execution(db.Model):
    __tablename__ = 'executions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    journey_id = db.Column(db.String(36), db.ForeignKey('journeys.id'), nullable=True)
    device_id = db.Column(db.String(36), db.ForeignKey('devices.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)

    is_cycle = db.Column(db.Boolean, default=False)
    cycle_params = db.Column(db.Text, nullable=True) # Stores JSON config for cycles

    # Lifecycle status: queued → running → completed → failed
    status = db.Column(db.String(50), default='queued')
    error_message = db.Column(db.Text, nullable=True)

    # Timing
    queued_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)

    # Link to resulting report (set after completion)
    report_id = db.Column(db.String(36), db.ForeignKey('reports.id'), nullable=True)
    report = db.relationship('Report', backref='execution_ref', foreign_keys=[report_id])

    # Process output for debugging
    stdout = db.Column(db.Text, nullable=True)
    stderr = db.Column(db.Text, nullable=True)
    return_code = db.Column(db.Integer, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "journey_id": self.journey_id,
            "device_id": self.device_id,
            "status": self.status,
            "error_message": self.error_message,
            "queued_at": self.queued_at.isoformat() if self.queued_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "report_id": self.report_id,
            "return_code": self.return_code,
        }
