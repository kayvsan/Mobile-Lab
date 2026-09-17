"""
Execution Config routes — CRUD + Run/Stop for saved automation configs
"""
from flask import Blueprint, request, jsonify, current_app, g

from models import db, ExecutionConfig, Execution, Journey
from services import executor_service
from services.auth_middleware import auth_required

execution_configs_bp = Blueprint('execution_configs', __name__)


@execution_configs_bp.route('/execution-configs', methods=['GET'])
@auth_required
def list_configs():
    """List all saved configs for the current user."""
    configs = ExecutionConfig.query.filter_by(user_id=g.current_user.id)\
        .order_by(ExecutionConfig.created_at.desc()).all()

    result = []
    for config in configs:
        data = config.to_dict()
        # Resolve journey names for display
        j_ids = config.get_journey_ids()
        journey_names = []
        for jid in j_ids:
            j = db.session.get(Journey, jid)
            if j:
                journey_names.append(j.name)
        data['journey_names'] = journey_names
        
        # Check if active execution is actually still running
        if config.active_execution_id:
            exec_obj = db.session.get(Execution, config.active_execution_id)
            if exec_obj and exec_obj.status in ('completed', 'failed', 'cancelled'):
                config.active_execution_id = None
                db.session.commit()
                data['active_execution_id'] = None
                data['execution_status'] = None
                data['execution_started_at'] = None

        result.append(data)

    return jsonify(result)


@execution_configs_bp.route('/execution-configs', methods=['POST'])
@auth_required
def create_config():
    """Create a new execution config."""
    data = request.json or {}
    name = data.get('name', '').strip()
    device_id = data.get('device_id')
    journey_ids = data.get('journey_ids', [])
    cycles = data.get('cycles', 1)
    interval_sec = data.get('interval', 0)

    if not name:
        return jsonify({"error": "Config name is required"}), 400
    if not device_id:
        return jsonify({"error": "Device is required"}), 400
    if not journey_ids or len(journey_ids) == 0:
        return jsonify({"error": "At least one journey is required"}), 400

    config = ExecutionConfig(
        name=name,
        device_id=device_id,
        cycles=int(cycles),
        interval=int(interval_sec),
        user_id=g.current_user.id,
    )
    config.set_journey_ids(journey_ids)

    db.session.add(config)
    db.session.commit()

    return jsonify(config.to_dict()), 201


@execution_configs_bp.route('/execution-configs/<config_id>', methods=['PUT'])
@auth_required
def update_config(config_id):
    """Update an existing execution config."""
    config = ExecutionConfig.query.filter_by(id=config_id, user_id=g.current_user.id).first()
    if not config:
        return jsonify({"error": "Config not found"}), 404

    # Cannot update if it's currently running
    if config.active_execution_id:
        exec_obj = db.session.get(Execution, config.active_execution_id)
        if exec_obj and exec_obj.status in ('queued', 'running'):
            return jsonify({"error": "Cannot update a running config"}), 409

    data = request.json or {}
    name = data.get('name', '').strip()
    device_id = data.get('device_id')
    journey_ids = data.get('journey_ids', [])
    cycles = data.get('cycles', 1)
    interval_sec = data.get('interval', 0)

    if not name:
        return jsonify({"error": "Config name is required"}), 400
    if not device_id:
        return jsonify({"error": "Device is required"}), 400
    if not journey_ids or len(journey_ids) == 0:
        return jsonify({"error": "At least one journey is required"}), 400

    config.name = name
    config.device_id = device_id
    config.cycles = int(cycles)
    config.interval = int(interval_sec)
    config.set_journey_ids(journey_ids)

    db.session.commit()

    return jsonify(config.to_dict())

@execution_configs_bp.route('/execution-configs/<config_id>', methods=['DELETE'])
@auth_required
def delete_config(config_id):
    """Delete a saved config."""
    config = ExecutionConfig.query.filter_by(id=config_id, user_id=g.current_user.id).first()
    if not config:
        return jsonify({"error": "Config not found"}), 404

    # Stop active execution if running
    if config.active_execution_id:
        try:
            executor_service.stop_execution(config.active_execution_id, current_app._get_current_object())
        except Exception:
            pass

    db.session.delete(config)
    db.session.commit()

    return jsonify({"message": "Config deleted"})


@execution_configs_bp.route('/execution-configs/<config_id>/run', methods=['POST'])
@auth_required
def run_config(config_id):
    """Run a saved config — starts a cycle execution."""
    config = ExecutionConfig.query.filter_by(id=config_id, user_id=g.current_user.id).first()
    if not config:
        return jsonify({"error": "Config not found"}), 404

    # Check if already running
    if config.active_execution_id:
        exec_obj = db.session.get(Execution, config.active_execution_id)
        if exec_obj and exec_obj.status in ('queued', 'running'):
            return jsonify({"error": "Config is already running", "execution_id": config.active_execution_id}), 409

    journey_ids = config.get_journey_ids()
    if not journey_ids:
        return jsonify({"error": "No journeys configured"}), 400

    try:
        execution = executor_service.start_cycle_execution(
            device_id=config.device_id,
            journey_ids=journey_ids,
            cycles=config.cycles,
            interval=config.interval,
            user_id=g.current_user.id,
            app=current_app._get_current_object()
        )

        config.active_execution_id = execution.id
        db.session.commit()

        return jsonify({
            "message": "Execution started",
            "execution": execution.to_dict(),
            "config": config.to_dict(),
        }), 202

    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to start: {str(e)}"}), 500


@execution_configs_bp.route('/execution-configs/<config_id>/stop', methods=['POST'])
@auth_required
def stop_config(config_id):
    """Stop the running execution for a config."""
    config = ExecutionConfig.query.filter_by(id=config_id, user_id=g.current_user.id).first()
    if not config:
        return jsonify({"error": "Config not found"}), 404

    if not config.active_execution_id:
        return jsonify({"error": "No active execution to stop"}), 400

    try:
        executor_service.stop_execution(config.active_execution_id, current_app._get_current_object())
        config.active_execution_id = None
        db.session.commit()
        return jsonify({"message": "Execution stopped"})
    except Exception as e:
        return jsonify({"error": f"Failed to stop: {str(e)}"}), 500
