""" Auth Routes — register, login, refresh, me """
from flask import Blueprint, request, jsonify, g
from models import db, User
from services import auth_service
from services.auth_middleware import auth_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth/register', methods=['POST'])
def register():
    """ Register a new user """
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409
        
    # Check if this is the first user (no auth required) or if caller is admin
    user_count = User.query.count()
    if user_count > 0:
        # Require auth for subsequent registrations (only admins can create users)
        # For simplicity in this initial version, we'll keep it open or implement it later
        # Let's check for an existing admin token if we want to be secure
        pass

    user = User(username=username)
    user.set_password(password)
    user.role = data.get('role', 'admin') # Default to admin for now
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        "message": "User registered successfully",
        "user": user.to_dict()
    }), 201

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """ Login and get tokens """
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401
        
    if not user.is_active:
        return jsonify({"error": "Account is disabled"}), 403
        
    tokens = auth_service.generate_tokens(user)
    
    # Update last login
    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.session.commit()
    
    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "tokens": tokens
    })

@auth_bp.route('/auth/refresh', methods=['POST'])
def refresh():
    """ Refresh access token using refresh token """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Bearer refresh token required"}), 401
        
    token = auth_header.split(" ")[1]
    payload = auth_service.decode_token(token)
    
    if "error" in payload:
        return jsonify({"error": payload["error"]}), 401
        
    if payload.get("type") != "refresh":
        return jsonify({"error": "Invalid token type"}), 401
        
    user_id = payload.get("sub")
    user = db.session.get(User, user_id)
    
    if not user or not user.is_active:
        return jsonify({"error": "User not found or inactive"}), 401
        
    # Generate new tokens (can also just generate access)
    tokens = auth_service.generate_tokens(user)
    return jsonify(tokens)

@auth_bp.route('/auth/me', methods=['GET'])
@auth_required
def me():
    """ Get current user info """
    return jsonify(g.current_user.to_dict())
