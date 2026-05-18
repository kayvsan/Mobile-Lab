"""
Routes package — register all blueprints
"""
from flask import Flask


def register_routes(app: Flask):
    """Register all route blueprints with the app"""
    from .journeys import journeys_bp
    from .reports import reports_bp
    from .devices import devices_bp
    from .auth import auth_bp
    from .executions import executions_bp
    from .webhook import webhook_bp
    from .app_packages import app_packages_bp
    from .agent import agent_bp

    app.register_blueprint(journeys_bp, url_prefix='/api')
    app.register_blueprint(reports_bp, url_prefix='/api')
    app.register_blueprint(devices_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(executions_bp, url_prefix='/api')
    app.register_blueprint(webhook_bp, url_prefix='/api')
    app.register_blueprint(app_packages_bp, url_prefix='/api')
    app.register_blueprint(agent_bp, url_prefix='/api')
