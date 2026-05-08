from flask import Blueprint, jsonify
from models import AppPackage
from services.auth_middleware import auth_required

app_packages_bp = Blueprint('app_packages', __name__)

@app_packages_bp.route('/app-packages', methods=['GET'])
@auth_required
def list_app_packages():
    """List all predefined app packages"""
    packages = AppPackage.query.order_by(AppPackage.name.asc()).all()
    return jsonify([p.to_dict() for p in packages])
