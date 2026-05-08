"""Device model — tracks connected ADB devices"""
import uuid
from datetime import datetime, timezone
from . import db


class Device(db.Model):
    __tablename__ = 'devices'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_key = db.Column(db.String(100), unique=True, nullable=False) # e.g. "device_01"
    udid = db.Column(db.String(100), nullable=False)   # serial e.g. "c2407b8a"
    name = db.Column(db.String(100))
    platform = db.Column(db.String(50), default='Android')
    platform_version = db.Column(db.String(20))
    
    # New metadata fields
    brand = db.Column(db.String(100))
    model = db.Column(db.String(100))
    manufacturer = db.Column(db.String(100))
    android_version = db.Column(db.String(20))
    sdk_version = db.Column(db.String(20))
    type_os = db.Column(db.String(50), default='android')
    
    status = db.Column(db.String(50), default='offline')  # online, busy, offline
    last_seen = db.Column(db.DateTime)

    def to_dict(self):
        from services.device_service import generate_scrcpy_url, generate_inspect_url
        return {
            "id": self.id,
            "udid": self.udid,
            "name": self.name,
            "brand": self.brand,
            "model": self.model,
            "manufacturer": self.manufacturer,
            "android_version": self.android_version,
            "type_os": self.type_os,
            "platform_version": self.platform_version,
            "status": self.status,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "stream_url": generate_scrcpy_url(self.udid) if self.status == 'online' else None,
            "inspect_url": generate_inspect_url(self.udid) if self.status == 'online' else None
        }
