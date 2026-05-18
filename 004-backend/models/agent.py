"""Agent model — tracks remote automation agents"""
import uuid
import secrets
from datetime import datetime, timezone
from . import db

class Agent(db.Model):
    __tablename__ = 'agents'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)         # "Laptop-Kams"
    api_key = db.Column(db.String(64), unique=True, nullable=False,
                        default=lambda: secrets.token_hex(32))
    status = db.Column(db.String(20), default='offline')     # online, offline
    last_heartbeat = db.Column(db.DateTime)
    
    # System info
    ip_address = db.Column(db.String(45))
    hostname = db.Column(db.String(100))
    os_info = db.Column(db.String(100))
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            "ip_address": self.ip_address,
            "hostname": self.hostname,
            "os_info": self.os_info,
            "device_count": len(self.devices) if self.devices else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
