""" Auth Middleware — provides decorators for protecting routes """
from functools import wraps
from flask import request, jsonify, g, current_app
from . import auth_service

def auth_required(f):
    """Decorator to require a valid JWT access token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
            
        token = auth_header.split(" ")[1]
        user = auth_service.get_user_from_token(token)
        
        if not user:
            # Check if it was an expired token error to provide better feedback
            payload = auth_service.decode_token(token)
            error_msg = payload.get("error", "Unauthorized")
            return jsonify({"error": error_msg}), 401
            
        if not user.is_active:
            return jsonify({"error": "User account is disabled"}), 403
            
        # Store user in flask context
        g.current_user = user
        return f(*args, **kwargs)
        
    return decorated

def webhook_auth_required(f):
    """Special decorator for webhooks supporting both API Key and Auth Token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # 1. Try API Key
        api_key = request.headers.get('X-API-Key')
        configured_key = current_app.config.get('WEBHOOK_API_KEY')
        
        if api_key and configured_key and api_key == configured_key:
            return f(*args, **kwargs)
            
        # 2. Try JWT Token (fallback)
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]
            user = auth_service.get_user_from_token(token)
            if user and user.is_active:
                g.current_user = user
                return f(*args, **kwargs)
                
        return jsonify({"error": "Valid API Key or Authorization Token required"}), 401
        
    return decorated
