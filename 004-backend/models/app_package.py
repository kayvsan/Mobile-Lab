import uuid
from datetime import datetime, timezone
from . import db

class AppPackage(db.Model):
    __tablename__ = 'app_packages'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    package = db.Column(db.String(200), nullable=False, unique=True)
    region = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "package": self.package,
            "region": self.region,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
