"""
Execution routes — trigger automation runs and track status via SSE
"""
import json
import time
from flask import Blueprint, request, jsonify, Response, current_app, g

from models import db, Execution
from services import executor_service
from services.auth_middleware import auth_required

executions_bp = Blueprint('executions', __name__)


@executions_bp.route('/execute/<journey_id>', methods=['POST'])
@auth_required
def start_execution(journey_id):
    """
    Start a journey execution on a device.
    Body: {"device_id": "device_01"}
    Returns 202 with execution_id for tracking.
    """
    data = request.json or {}
    device_id = data.get('device_id')

    if not device_id:
        return jsonify({"error": "Missing required field: device_id"}), 400

    try:
        execution = executor_service.start_execution(
            journey_id=journey_id,
            device_id=device_id,
            user_id=g.current_user.id,
            app=current_app._get_current_object()
        )
        return jsonify({
            "message": "Execution started",
            "execution": execution.to_dict(),
        }), 202

    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to start execution: {str(e)}"}), 500


@executions_bp.route('/execute/cycle', methods=['POST'])
@auth_required
def start_cycle_execution():
    """
    Start a cycle of journeys on a device.
    Body: {
        "device_id": "device_01",
        "journey_ids": ["j1", "j2"],
        "cycles": 5,
        "interval": 60
    }
    """
    data = request.json or {}
    device_id = data.get('device_id')
    journey_ids = data.get('journey_ids', [])
    cycles = data.get('cycles', 1)
    interval = data.get('interval', 0)

    if not device_id or not journey_ids:
        return jsonify({"error": "Missing required fields: device_id or journey_ids"}), 400

    try:
        execution = executor_service.start_cycle_execution(
            device_id=device_id,
            journey_ids=journey_ids,
            cycles=cycles,
            interval=interval,
            user_id=g.current_user.id,
            app=current_app._get_current_object()
        )
        return jsonify({
            "message": "Cycle execution started",
            "execution": execution.to_dict(),
        }), 202

    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to start cycle execution: {str(e)}"}), 500


@executions_bp.route('/executions', methods=['GET'])
@auth_required
def list_executions():
    """
    List current user's executions with optional filters.
    Query params: journey_id, status, limit, offset
    """
    query = Execution.query.filter_by(user_id=g.current_user.id)

    journey_id = request.args.get('journey_id')
    if journey_id:
        query = query.filter_by(journey_id=journey_id)

    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    total = query.count()
    executions = query.order_by(Execution.queued_at.desc()).offset(offset).limit(limit).all()

    return jsonify({
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [e.to_dict() for e in executions],
    })


@executions_bp.route('/executions/<execution_id>', methods=['GET'])
@auth_required
def get_execution(execution_id):
    """Get execution details (must belong to user)"""
    execution = Execution.query.filter_by(id=execution_id, user_id=g.current_user.id).first()
    if not execution:
        return jsonify({"error": f"Execution {execution_id} not found"}), 404

    result = execution.to_dict()
    result["stdout"] = execution.stdout
    result["stderr"] = execution.stderr
    return jsonify(result)


@executions_bp.route('/executions/<execution_id>/stream', methods=['GET'])
@auth_required
def stream_execution(execution_id):
    """
    SSE endpoint — stream real-time execution events.
    """
    execution = Execution.query.filter_by(id=execution_id, user_id=g.current_user.id).first()
    if not execution:
        return jsonify({"error": f"Execution {execution_id} not found"}), 404

    def event_stream():
        last_seen = 0
        timeout_counter = 0
        max_timeout = 660  # 11 minutes (execution timeout is 10 min)

        while timeout_counter < max_timeout:
            events = executor_service.get_execution_events(execution_id)

            # Send any new events
            if len(events) > last_seen:
                for event in events[last_seen:]:
                    yield f"event: {event['type']}\ndata: {json.dumps(event['data'])}\n\n"
                last_seen = len(events)

                # Check if terminal event
                last_type = events[-1]['type']
                if last_type in ('completed', 'failed'):
                    yield f"event: close\ndata: {json.dumps({'reason': last_type})}\n\n"
                    return

            time.sleep(1)
            timeout_counter += 1

        yield f"event: close\ndata: {json.dumps({'reason': 'timeout'})}\n\n"

    return Response(
        event_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        }
    )
