""" Auth Service — handles JWT token generation and validation """
import jwt
from datetime import datetime, timedelta, timezone
from flask import current_app
from models import db, User

def generate_tokens(user: User):
    """Generate access and refresh tokens for a user"""
    now = datetime.now(timezone.utc)
    
    access_payload = {
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(seconds=current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 86400))
    }
    
    refresh_payload = {
        "sub": user.id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(seconds=current_app.config.get('JWT_REFRESH_TOKEN_EXPIRES', 604800))
    }
    
    secret = current_app.config.get('SECRET_KEY')
    
    access_token = jwt.encode(access_payload, secret, algorithm="HS256")
    refresh_token = jwt.encode(refresh_payload, secret, algorithm="HS256")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 900)
    }

def decode_token(token: str):
    """Decode and validate a JWT token"""
    try:
        secret = current_app.config.get('SECRET_KEY')
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return {"error": "Token has expired"}
    except jwt.InvalidTokenError as e:
        print(f"JWT Invalid Token Error: {str(e)}")
        print(f"Token received: {token[:10]}...{token[-10:] if len(token) > 10 else ''}")
        return {"error": "Invalid token"}
    except Exception as e:
        print(f"JWT Unexpected Error: {str(e)}")
        return {"error": str(e)}

def get_user_from_token(token: str):
    """Get the User object from an access token"""
    payload = decode_token(token)
    if "error" in payload:
        return None
    
    if payload.get("type") != "access":
        return None
        
    user_id = payload.get("sub")
    return db.session.get(User, user_id)
