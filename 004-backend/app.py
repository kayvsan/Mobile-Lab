"""
APM Backend — Flask Application Factory
"""
from flask import Flask, jsonify

from config import Config
from models import db
from routes import register_routes


def create_app(config_class=Config):
    """Create and configure the Flask application"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)

    # Create database tables
    with app.app_context():
        db.create_all()
        from services.seeder_service import seed_app_packages
        seed_app_packages()

    # Create uploads directory for screenshots
    import os
    os.makedirs(app.config['SCREENSHOTS_DIR'], exist_ok=True)

    # Register all route blueprints
    register_routes(app)

    # Health check (root level)
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "healthy", "service": "apm-backend"}), 200

    # CORS configuration
    from flask_cors import CORS
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True, allow_headers=["Content-Type", "Authorization", "X-Device-Id", "X-Execution-Id"])

    return app
