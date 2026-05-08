"""
Webhook routes — receive reports directly from 003-modular-apm script
"""
from flask import Blueprint, request, jsonify, g

from models import db, Report, Execution, Journey, Device
from services.auth_middleware import webhook_auth_required

webhook_bp = Blueprint('webhook', __name__)


@webhook_bp.route('/webhook/report', methods=['POST'])
@webhook_auth_required
def receive_report():
    """
    Webhook endpoint for the APM automation script to push report data
    directly after execution completes.

    Expected payload: Full APM report JSON + optional execution_id, device_id headers/fields

    This is the preferred way to get reports into the DB (vs polling log files).
    """
    data = request.json
    if not data:
        return jsonify({"error": "No JSON payload"}), 400

    journey_id_key = data.get('journey_id')
    if not journey_id_key:
        return jsonify({"error": "Missing journey_id in report"}), 400

    # Resolve journey UUID
    journey = Journey.query.filter_by(journey_key=journey_id_key).first()
    if not journey:
        return jsonify({"error": f"Journey '{journey_id_key}' not found in database"}), 404

    # Resolve device UUID
    device_id_key = data.pop('_device_id', None) or request.headers.get('X-Device-Id')
    device = None
    if device_id_key:
        device = Device.query.filter_by(device_key=device_id_key).first() or \
                 Device.query.filter_by(udid=device_id_key).first()
    
    if not device:
        # Fallback to a default or error? Let's error for consistency with new schema
        return jsonify({"error": f"Device '{device_id_key}' not found"}), 404

    execution_id = data.pop('_execution_id', None) or request.headers.get('X-Execution-Id')
    if execution_id:
        execution_id = str(execution_id).strip() or None

    # Update data with UUID journey_id for factory method
    data['journey_id'] = journey.id
    user_id = getattr(g, 'current_user', None).id if hasattr(g, 'current_user') and g.current_user else journey.user_id

    # Create report from JSON data
    report = Report.from_report_json(data, device.id, user_id, execution_id)
    db.session.add(report)
    db.session.flush()
    
    # Copy screenshots if any
    screenshot_paths = report.screenshots or []
    if screenshot_paths:
        import os, shutil
        from config import Config
        
        saved_screenshots = []
        report_screenshots_dir = os.path.join(Config.SCREENSHOTS_DIR, report.id)
        os.makedirs(report_screenshots_dir, exist_ok=True)
        
        for spath in screenshot_paths:
            src_file = os.path.join(Config.MODULAR_APM_PATH, spath)
            if os.path.exists(src_file):
                basename = os.path.basename(spath)
                dst_file = os.path.join(report_screenshots_dir, basename)
                try:
                    shutil.copy2(src_file, dst_file)
                    saved_screenshots.append(basename)
                except Exception as e:
                    print(f"Failed to copy screenshot {src_file}: {e}")
        
        report.screenshots = saved_screenshots

    db.session.commit()

    # If linked to an execution, update it
    if execution_id:
        execution = db.session.get(Execution, execution_id)
        if execution:
            execution.report_id = report.id
            execution.status = 'completed' if report.success else 'failed'
            db.session.commit()

    return jsonify({
        "message": "Report received",
        "report_id": report.id,
        "journey_id": journey.id,
        "success": report.success,
        "total_response_time": report.total_response_time,
    }), 201
