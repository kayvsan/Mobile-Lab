"""
Journey routes — CRUD + import from file system
"""
import os
import json
from flask import Blueprint, request, jsonify, g

from models import db, Journey
from config import Config
from services.auth_middleware import auth_required, webhook_auth_required

journeys_bp = Blueprint('journeys', __name__)


@journeys_bp.route('/journeys', methods=['GET'])
@auth_required
def list_journeys():
    """List only current user's journeys"""
    include_details = request.args.get('details', 'false').lower() == 'true'
    journeys = Journey.query.filter_by(user_id=g.current_user.id).order_by(Journey.created_at.desc()).all()
    return jsonify([j.to_dict(include_details=include_details) for j in journeys])


@journeys_bp.route('/journeys/<journey_id>', methods=['GET'])
@auth_required
def get_journey(journey_id):
    """Get a single journey (must belong to current user)"""
    journey = Journey.query.filter(
        (Journey.id == journey_id) | (Journey.journey_key == journey_id),
        Journey.user_id == g.current_user.id
    ).first()
    
    if not journey:
        return jsonify({"error": f"Journey '{journey_id}' not found"}), 404
    return jsonify(journey.to_dict(include_details=True))


@journeys_bp.route('/journeys/<journey_id>/apm-payload', methods=['GET'])
@webhook_auth_required  # Uses X-API-Key, no JWT needed
def get_journey_apm_payload(journey_id):
    """
    Internal endpoint for APM subprocess.
    Returns journey data in APM-compatible format.
    """
    journey = Journey.query.filter(
        (Journey.id == journey_id) | (Journey.journey_key == journey_id)
    ).first()

    if not journey:
        return jsonify({"error": f"Journey '{journey_id}' not found"}), 404

    # Format exactly matching the JSON file previously generated
    return jsonify({
        "journey": {
            "id": journey.journey_key,
            "name": journey.name,
            "package": journey.package,
            "platform": journey.platform,
            "details": journey.details,
        },
        "any_param": {} # Placeholder if needed
    })


@journeys_bp.route('/journeys', methods=['POST'])
@auth_required
def create_journey():
    """Create a new journey from JSON payload"""
    data = request.json or {}
    jkey = data.get('journey_key') or data.get('id')
    details = data.get('details')
    
    if not jkey or not details:
        return jsonify({"error": "Missing required fields: journey_key (or id), details"}), 400

    # Check if exists
    if Journey.query.filter_by(journey_key=jkey).first():
        return jsonify({"error": f"Journey with key '{jkey}' already exists"}), 409

    journey = Journey(
        journey_key=jkey,
        name=data.get('name', jkey),
        package=data.get('package', ''),
        platform=data.get('platform', 'android'),
        details=data['details'],
        user_id=g.current_user.id,
    )
    db.session.add(journey)
    db.session.commit()

    return jsonify(journey.to_dict()), 201


@journeys_bp.route('/journeys/<journey_id>', methods=['PUT'])
@auth_required
def update_journey(journey_id):
    """Update an existing journey (must belong to user)"""
    journey = Journey.query.filter(
        (Journey.id == journey_id) | (Journey.journey_key == journey_id),
        Journey.user_id == g.current_user.id
    ).first()
    if not journey:
        return jsonify({"error": f"Journey '{journey_id}' not found"}), 404

    data = request.json
    if data.get('name'):
        journey.name = data['name']
    if data.get('package') is not None:
        journey.package = data['package']
    if data.get('platform'):
        journey.platform = data['platform']
    if data.get('details'):
        journey.details = data['details']

    db.session.commit()
    return jsonify(journey.to_dict())


@journeys_bp.route('/journeys/<journey_id>', methods=['DELETE'])
@auth_required
def delete_journey(journey_id):
    """Delete a journey (must belong to user)"""
    journey = Journey.query.filter(
        (Journey.id == journey_id) | (Journey.journey_key == journey_id),
        Journey.user_id == g.current_user.id
    ).first()
    if not journey:
        return jsonify({"error": f"Journey '{journey_id}' not found"}), 404

    db.session.delete(journey)
    db.session.commit()
    return jsonify({"message": f"Journey deleted"}), 200


@journeys_bp.route('/journeys/import', methods=['POST'])
@auth_required
def import_journeys():
    """
    Import all journey JSON files from 003-modular-apm/config/journeys/
    Skips already existing journeys.
    """
    journeys_dir = Config.JOURNEYS_DIR
    if not os.path.exists(journeys_dir):
        return jsonify({"error": f"Journeys directory not found: {journeys_dir}"}), 404

    imported = []
    skipped = []
    errors = []

    for filename in os.listdir(journeys_dir):
        if not filename.endswith('.json'):
            continue

        filepath = os.path.join(journeys_dir, filename)
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)

            journey_data = data.get('journey', {})
            jkey = journey_data.get('id')
            if not jkey:
                errors.append({"file": filename, "error": "No journey.id found"})
                continue

            if Journey.query.filter_by(journey_key=jkey).first():
                skipped.append(jkey)
                continue

            journey = Journey(
                journey_key=jkey,
                name=journey_data.get('name', jkey),
                package=journey_data.get('package', ''),
                platform=journey_data.get('platform', 'android'),
                details=journey_data.get('details', []),
                user_id=g.current_user.id,
            )
            db.session.add(journey)
            imported.append(jkey)

        except Exception as e:
            errors.append({"file": filename, "error": str(e)})

    db.session.commit()

    return jsonify({
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "total_imported": len(imported),
    })
