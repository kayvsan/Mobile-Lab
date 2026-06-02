"""Report model — enriched with NVT/network measurement data"""
import uuid
from datetime import datetime, timezone
from . import db


class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    journey_id = db.Column(db.String(36), db.ForeignKey('journeys.id'), nullable=False)
    device_id = db.Column(db.String(36), db.ForeignKey('devices.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    execution_id = db.Column(db.String(36), db.ForeignKey('executions.id'), nullable=True)

    # Relationships
    journey = db.relationship('Journey', backref=db.backref('reports_list', lazy='dynamic'))
    device = db.relationship('Device', backref=db.backref('reports_list', lazy='dynamic'))

    # Core metrics
    success = db.Column(db.Boolean, default=False)
    total_response_time = db.Column(db.Float)

    # Location data
    location = db.Column(db.JSON)  # {"lat": "...", "long": "..."}

    # NVT Measurements (full snapshot)
    nvt_measurements = db.Column(db.JSON)  # signal_level, cellid, test_api, test_ping

    # Extracted fields for quick filtering/querying
    network_type = db.Column(db.String(20))   # "4G", "5G", "WiFi"
    signal_level = db.Column(db.String(20))   # e.g. "-79"
    ping_latency = db.Column(db.Float)        # ms
    packet_loss = db.Column(db.Float)         # percentage

    # Execution sub journey details (full JSON)
    details = db.Column(db.JSON)

    # Screenshots (list of paths)
    screenshots = db.Column(db.JSON)

    # Screen recording video path
    recording = db.Column(db.String(255))

    # Timing
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self, include_details=True):
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "journey_id": self.journey_id,
            "journey": self.journey.name if self.journey else None,
            "device_id": self.device_id,
            "device": self.device.name if self.device else None,
            "execution_id": self.execution_id,
            "success": self.success,
            "total_response_time": self.total_response_time,
            "location": self.location,
            "network_type": self.network_type,
            "signal_level": self.signal_level,
            "ping_latency": self.ping_latency,
            "packet_loss": self.packet_loss,
            "nvt_measurements": self.nvt_measurements,
            "screenshots": self.screenshots,
            "recording": self.recording,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_details:
            result["details"] = self.details
        return result

    @classmethod
    def from_report_json(cls, report_data: dict, device_id: str, user_id: str, execution_id: str = None):
        """Factory method to create Report from APM JSON report output"""
        nvt = report_data.get('nvt_measurements', {})

        # Fallback to the first detail's network_params if root NVT is empty 
        # (happens because NVT is now only taken at the start of details)
        if not nvt:
            details = report_data.get('details', [])
            if details and len(details) > 0:
                nvt = details[0].get('network_params', {})

        # Extract network type from signal_level data
        signal_info = nvt.get('signal_level', {})
        network_type = signal_info.get('network_type')
        sig_level = signal_info.get('signal_level')

        # Extract ping data
        ping_info = nvt.get('test_ping', {})
        ping_latency = ping_info.get('latency')
        packet_loss_val = ping_info.get('packet_loss')

        # Parse times
        start_time = None
        end_time = None
        try:
            if report_data.get('start_time'):
                start_time = datetime.fromisoformat(report_data['start_time'])
            if report_data.get('end_time'):
                end_time = datetime.fromisoformat(report_data['end_time'])
        except (ValueError, TypeError):
            pass

        return cls(
            journey_id=report_data.get('journey_id'),
            device_id=device_id,
            user_id=user_id,
            execution_id=execution_id,
            success=report_data.get('success', False),
            total_response_time=report_data.get('summary', {}).get('total_response_time'),
            location=report_data.get('location'),
            nvt_measurements=nvt,
            network_type=network_type,
            signal_level=str(sig_level) if sig_level else None,
            ping_latency=ping_latency,
            packet_loss=packet_loss_val,
            details=report_data.get('details', []),
            screenshots=report_data.get('summary', {}).get('screenshot_paths', []),
            recording=report_data.get('summary', {}).get('recording_path'),
            start_time=start_time,
            end_time=end_time,
        )
