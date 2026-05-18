"""
Agent routes — endpoints for remote agents and management
"""
from flask import Blueprint, request, jsonify, current_app, g
from models import db, Agent, Execution, Device, Journey
from services import agent_service, executor_service
from services.auth_middleware import auth_required, webhook_auth_required
import functools

agent_bp = Blueprint('agent', __name__)

def agent_auth_required(f):
    """Middleware to authenticate agent via X-Agent-Key header"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get('X-Agent-Key')
        if not api_key:
            return jsonify({"error": "Missing X-Agent-Key header"}), 401
        
        agent = Agent.query.filter_by(api_key=api_key).first()
        if not agent:
            return jsonify({"error": "Invalid Agent Key"}), 401
        
        g.current_agent = agent
        return f(*args, **kwargs)
    return decorated

# --- Management Endpoints (for Frontend) ---

@agent_bp.route('/agents', methods=['GET'])
@auth_required
def list_agents():
    """List all registered agents"""
    agents = agent_service.get_all_agents()
    return jsonify([a.to_dict() for a in agents])

@agent_bp.route('/agents/register', methods=['POST'])
@auth_required
def register_agent():
    """Register a new agent"""
    data = request.json or {}
    name = data.get('name')
    if not name:
        return jsonify({"error": "Name is required"}), 400
    
    agent = agent_service.register_agent(name)
    return jsonify({
        "message": "Agent registered",
        "agent": agent.to_dict(),
        "api_key": agent.api_key # Only returned on registration
    }), 201

# --- Agent-to-Server Endpoints (for 006-agent) ---

@agent_bp.route('/agent/heartbeat', methods=['POST'])
@agent_auth_required
def heartbeat():
    """Receive heartbeat and device list from agent"""
    data = request.json or {}
    agent = agent_service.process_heartbeat(
        agent_id=g.current_agent.id,
        data=data,
        ip_address=request.remote_addr
    )
    return jsonify({"status": "ok", "agent_id": agent.id})

@agent_bp.route('/agent/tasks', methods=['GET'])
@agent_auth_required
def get_tasks():
    """Poll for pending tasks"""
    tasks = agent_service.get_pending_tasks(g.current_agent.id)
    
    payload = []
    for t in tasks:
        # Get journey data
        journey = db.session.get(Journey, t.journey_id)
        device = db.session.get(Device, t.device_id)
        
        # Build payload for modular-apm main.py
        # We provide the API URL for the journey payload
        api_port = current_app.config.get('SERVER_PORT', 5000)
        # Note: In production, this should be the PUBLIC URL
        # For now, we assume the agent can reach the server at this address
        api_url = f"{request.host_url.rstrip('/')}/api/journeys/{t.journey_id}/apm-payload"
        
        payload.append({
            "id": t.id,
            "journey_id": t.journey_id,
            "journey_name": journey.name if journey else "Unknown",
            "device_id": device.device_key,
            "device_udid": device.udid,
            "api_url": api_url,
            "api_key": current_app.config.get('WEBHOOK_API_KEY', '')
        })
        
    return jsonify(payload)

@agent_bp.route('/agent/tasks/<execution_id>/status', methods=['POST'])
@agent_auth_required
def update_task_status(execution_id):
    """Update execution status (running, completed, failed)"""
    data = request.json or {}
    status = data.get('status')
    error = data.get('error')
    
    if not status:
        return jsonify({"error": "Status is required"}), 400
    
    success = agent_service.update_execution_status(execution_id, status, error)
    if not success:
        return jsonify({"error": "Execution not found"}), 404
    
    # Push SSE event
    executor_service._push_event(execution_id, status, {
        "message": f"Agent reported: {status}",
        "error": error
    })
    
    return jsonify({"status": "updated"})

@agent_bp.route('/agent/tasks/<execution_id>/log', methods=['POST'])
@agent_auth_required
def push_task_log(execution_id):
    """Push real-time log lines from agent"""
    data = request.json or {}
    message = data.get('message')
    
    if message:
        executor_service._push_event(execution_id, "log", {"message": message})
        
    return jsonify({"status": "ok"})

@agent_bp.route('/agent/upload', methods=['POST'])
@agent_auth_required
def upload_file():
    """Upload result files (screenshots/recordings) from agent"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    exec_id = request.form.get('execution_id')
    file_type = request.form.get('type') # 'screenshot' or 'recording'
    
    if not exec_id or not file_type:
        return jsonify({"error": "execution_id and type are required"}), 400

    # Determine destination
    if file_type == 'screenshot':
        # Screenshots are usually stored in uploads/screenshots/<execution_id>/
        # But here we might not have a report_id yet. 
        # For now, let's just put it in a temp dir or handle it similarly to local
        dest_dir = os.path.join(current_app.config['SCREENSHOTS_DIR'], "temp_agent", exec_id)
    else:
        dest_dir = current_app.config['RECORDINGS_DIR']
        
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, file.filename)
    file.save(file_path)
    
    return jsonify({"message": "File uploaded", "path": file.filename}), 201
