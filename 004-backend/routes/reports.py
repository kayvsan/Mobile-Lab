"""
Report routes — list, detail, stats, and import
"""
from flask import Blueprint, request, jsonify, g

from models import db, Report
from services import report_service
from services.auth_middleware import auth_required

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/reports', methods=['GET'])
@auth_required
def list_reports():
    """
    List current user's reports with optional filters.
    Query params: journey_id, success, network_type, limit, offset
    """
    query = Report.query.filter_by(user_id=g.current_user.id)

    # Filters
    journey_id = request.args.get('journey_id')
    if journey_id:
        query = query.filter_by(journey_id=journey_id)

    success = request.args.get('success')
    if success is not None:
        query = query.filter_by(success=success.lower() == 'true')

    network_type = request.args.get('network_type')
    if network_type:
        query = query.filter_by(network_type=network_type)

    # Pagination
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    total = query.count()
    reports = query.options(
        db.joinedload(Report.journey),
        db.joinedload(Report.device)
    ).order_by(Report.created_at.desc()).offset(offset).limit(limit).all()

    return jsonify({
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [r.to_dict(include_details=False) for r in reports],
    })


@reports_bp.route('/reports/<report_id>', methods=['GET'])
@auth_required
def get_report(report_id):
    """Get report detail (must belong to user)"""
    report = Report.query.filter_by(id=report_id, user_id=g.current_user.id).first()
    if not report:
        return jsonify({"error": f"Report {report_id} not found"}), 404

    result = report.to_dict(include_details=True)
    result["breakdown"] = report_service.get_detail_breakdown(report_id)
    return jsonify(result)


@reports_bp.route('/reports/stats', methods=['GET'])
@auth_required
def get_stats():
    """
    Get aggregated statistics for current user.
    Optional query param: journey_id
    """
    journey_id = request.args.get('journey_id')
    stats = report_service.get_journey_stats(journey_id, user_id=g.current_user.id)
    return jsonify(stats)


@reports_bp.route('/reports/import', methods=['POST'])
@auth_required
def import_reports():
    """
    Import report JSON files from 003-modular-apm/logs/
    Skips already imported reports (based on start_time).
    """
    device_id = request.json.get('device_id', 'unknown') if request.json else 'unknown'
    imported = report_service.import_reports_from_logs(device_id, user_id=g.current_user.id)

    return jsonify({
        "imported_count": len(imported),
        "imported_ids": [r.id for r in imported],
    })


@reports_bp.route('/reports/<report_id>', methods=['DELETE'])
@auth_required
def delete_report(report_id):
    """Delete a specific report (must belong to user)"""
    report = Report.query.filter_by(id=report_id, user_id=g.current_user.id).first()
    if not report:
        return jsonify({"error": f"Report {report_id} not found"}), 404

    db.session.delete(report)
    db.session.commit()
    return jsonify({"message": f"Report {report_id} deleted"})


@reports_bp.route('/reports/<report_id>/screenshots/<filename>', methods=['GET'])
def get_screenshot(report_id, filename):
    """Serve screenshot file for a report"""
    from flask import send_from_directory
    from config import Config
    import os
    
    # We allow public access since report_id is a UUID (unguessable) 
    # to support direct <img> tags without passing Bearer tokens.
    report = Report.query.filter_by(id=report_id).first()
    if not report:
        return jsonify({"error": f"Report {report_id} not found"}), 404
        
    report_screenshots_dir = os.path.join(Config.SCREENSHOTS_DIR, report_id)
    if not os.path.exists(os.path.join(report_screenshots_dir, filename)):
        return jsonify({"error": "Screenshot not found"}), 404
        
    return send_from_directory(report_screenshots_dir, filename)


@reports_bp.route('/reports/<report_id>/recording', methods=['GET'])
def get_recording(report_id):
    """Serve recording video file for a report"""
    from flask import send_from_directory
    from config import Config
    import os
    
    report = Report.query.filter_by(id=report_id).first()
    if not report or not report.recording:
        return jsonify({"error": "Recording not found"}), 404
        
    # report.recording stores just the basename
    return send_from_directory(Config.RECORDINGS_DIR, report.recording)
