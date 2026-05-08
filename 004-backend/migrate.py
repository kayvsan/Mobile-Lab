"""
Database Migration — Import existing data into the new schema
Handles: journeys from config files + reports from log files
"""
import os
import json
from app import create_app
from models import db, Journey, Report, User
from config import Config


def migrate_journeys(user_id: str):
    """Import journey files from 003-modular-apm/config/journeys/"""
    journeys_dir = Config.JOURNEYS_DIR
    if not os.path.exists(journeys_dir):
        print(f"Error: Journeys directory not found at {journeys_dir}")
        return 0

    count = 0
    for filename in os.listdir(journeys_dir):
        if not filename.endswith(".json"):
            continue

        filepath = os.path.join(journeys_dir, filename)
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)

            journey_data = data.get('journey', {})
            jkey = journey_data.get('id')
            if not jkey:
                print(f"  Skip {filename}: No journey.id found")
                continue

            # Check by journey_key
            if Journey.query.filter_by(journey_key=jkey).first():
                print(f"  Skip {jkey}: Already exists")
                continue

            journey = Journey(
                journey_key=jkey,
                name=journey_data.get('name', jkey),
                package=journey_data.get('package', ''),
                platform=journey_data.get('platform', 'android'),
                details=journey_data.get('details', []),
                user_id=user_id,
            )
            db.session.add(journey)
            count += 1
            print(f"  Imported journey: {jkey}")

        except Exception as e:
            print(f"  Error importing {filename}: {e}")

    db.session.commit()
    return count


def migrate_reports(user_id: str, default_device_id: str = "device_01"):
    """Import report JSON files from 003-modular-apm/logs/"""
    from services.report_service import import_reports_from_logs
    imported = import_reports_from_logs(default_device_id, user_id=user_id)
    return len(imported)


def seed_admin():
    """Create default admin user if none exists"""
    if User.query.count() == 0:
        admin = User(username='admin', role='admin')
        admin.set_password('admin')
        db.session.add(admin)
        db.session.commit()
        print("  Created default admin user (admin/admin)")
        return admin.id
    admin = User.query.filter_by(username='admin').first()
    return admin.id if admin else None


def run_migration():
    """Run full migration"""
    app = create_app()

    with app.app_context():
        print("=" * 50)
        print("  APM Backend — Database Migration")
        print("=" * 50)

        # Ensure tables exist
        db.create_all()
        print("[3/3] Seeding/Getting admin user...")
        admin_id = seed_admin()
        if not admin_id:
            print("  Error: Could not find or create admin user\n")
            return

        print("\n[1/2] Importing journeys...")
        j_count = migrate_journeys(admin_id)
        print(f"  -> {j_count} journeys imported\n")

        # print("[2/2] Importing reports from logs...")
        # r_count = migrate_reports(admin_id)
        # print(f"  -> {r_count} reports imported\n")

        print("=" * 50)
        print(f"  Migration complete!")
        print(f"  Total journeys: {Journey.query.count()}")
        print(f"  Total reports:  {Report.query.count()}")
        print("=" * 50)


if __name__ == "__main__":
    run_migration()
