"""Journey model — stores automation journey definitions"""
import uuid
from datetime import datetime, timezone
from . import db


class Journey(db.Model):
    __tablename__ = 'journeys'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    journey_key = db.Column(db.String(100), unique=True, nullable=False) # semantic key e.g. "instagram_feed_clips"
    name = db.Column(db.String(200), nullable=False)
    package = db.Column(db.String(200), nullable=False, default='')
    platform = db.Column(db.String(50), default='android')
    # Full steps/tasks definition as JSON
    details = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    # Relationships are handled via backrefs in other models (Report, Execution)
    executions = db.relationship('Execution', backref='journey', lazy='dynamic')

    def to_dict(self, include_details=True):
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "journey_key": self.journey_key,
            "name": self.name,
            "package": self.package,
            "platform": self.platform,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "report_count": self.reports_list.count() if hasattr(self, 'reports_list') and self.reports_list else 0,
        }
        if include_details:
            result["details"] = self.details
        return result
