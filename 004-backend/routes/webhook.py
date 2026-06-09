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
            basename = os.path.basename(spath)
            src_file = os.path.join(Config.MODULAR_APM_PATH, spath)
            temp_agent_file = os.path.join(Config.SCREENSHOTS_DIR, "temp_agent", execution_id, basename) if execution_id else None
            
            src_to_copy = None
            if os.path.exists(src_file):
                src_to_copy = src_file
            elif temp_agent_file and os.path.exists(temp_agent_file):
                src_to_copy = temp_agent_file
                
            if src_to_copy:
                dst_file = os.path.join(report_screenshots_dir, basename)
                try:
                    shutil.copy2(src_to_copy, dst_file)
                    saved_screenshots.append(basename)
                except Exception as e:
                    print(f"Failed to copy screenshot {src_to_copy}: {e}")
        
        report.screenshots = saved_screenshots

    # Copy/Associate recording if any
    if report.recording:
        import os, shutil
        from config import Config
        
        basename = os.path.basename(report.recording)
        src_file = os.path.join(Config.MODULAR_APM_PATH, report.recording)
        uploaded_file = os.path.join(Config.RECORDINGS_DIR, basename)
        
        if os.path.exists(src_file):
            os.makedirs(Config.RECORDINGS_DIR, exist_ok=True)
            dst_file = os.path.join(Config.RECORDINGS_DIR, basename)
            try:
                shutil.copy2(src_file, dst_file)
                report.recording = basename
            except Exception as e:
                print(f"Failed to copy recording {src_file}: {e}")
        elif os.path.exists(uploaded_file):
            report.recording = basename

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
