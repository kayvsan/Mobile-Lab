"""
Backend Configuration
"""
import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# Load environment variables from .env file
load_dotenv(os.path.join(BASE_DIR, '.env'))

MODULAR_APM_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "003-modular-apm"))


class Config:
    """Base configuration"""
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///' + os.path.join(BASE_DIR, 'apm_backend.db')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Engine options for connection pooling (mostly applicable for PostgreSQL)
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # Path to 003-modular-apm project
    MODULAR_APM_PATH = MODULAR_APM_PATH
    JOURNEYS_DIR = os.path.join(MODULAR_APM_PATH, "config", "journeys")
    LOGS_DIR = os.path.join(MODULAR_APM_PATH, "logs")
    DEVICE_CONFIG_PATH = os.path.join(MODULAR_APM_PATH, "config", "device.json")
    SCREENSHOTS_SRC_DIR = os.path.join(MODULAR_APM_PATH, "screenshots")
    SCREENSHOTS_DIR = os.path.join(BASE_DIR, "uploads", "screenshots")
    RECORDINGS_DIR = os.path.join(BASE_DIR, "uploads", "recordings")

    # Scrcpy settings
    SCRCPY_HOST = os.environ.get('SCRCPY_HOST', 'localhost')
    SCRCPY_PORT = os.environ.get('SCRCPY_PORT', '8000')
    INSPECT_HOST = os.environ.get('INSPECT_HOST', 'localhost')
    INSPECT_PORT = os.environ.get('INSPECT_PORT', '20242')

    # Execution settings
    PYTHON_EXECUTABLE = os.environ.get('PYTHON_EXE', os.path.join(MODULAR_APM_PATH, 'env', 'bin', 'python'))
    SERVER_PORT = int(os.environ.get('SERVER_PORT', '5000'))

    # Security settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-replace-me')
    WEBHOOK_API_KEY = os.environ.get('WEBHOOK_API_KEY', 'apm-default-api-key')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hour
    JWT_REFRESH_TOKEN_EXPIRES = 604800  # 7 days
