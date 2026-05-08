"""
Device routes — list and refresh ADB devices
"""
from flask import Blueprint, jsonify

from models import db, Device
from services import device_service
from services.auth_middleware import auth_required

devices_bp = Blueprint('devices', __name__)


@devices_bp.route('/devices', methods=['GET'])
def list_devices():
    """List all known devices with current status (auto-refresh)"""
    # Trigger refresh to get latest ADB status
    devices = device_service.refresh_device_status()
    return jsonify([d.to_dict() for d in devices])


@devices_bp.route('/devices/refresh', methods=['POST'])
@auth_required
def refresh_devices():
    """
    Re-scan ADB devices and sync with device.json config.
    Updates online/offline status.
    """
    devices = device_service.refresh_device_status()
    return jsonify({
        "message": "Device status refreshed",
        "devices": [d.to_dict() for d in devices],
    })


@devices_bp.route('/devices/<device_id>', methods=['GET'])
def get_device(device_id):
    """Get a single device (supports UUID, device_key, or udid)"""
    device = db.session.get(Device, device_id) or \
             Device.query.filter_by(device_key=device_id).first() or \
             Device.query.filter_by(udid=device_id).first()
             
    if not device:
        return jsonify({"error": f"Device '{device_id}' not found"}), 404
    return jsonify(device.to_dict())
