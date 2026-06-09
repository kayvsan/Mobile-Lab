import sqlite3
import json
import os
from datetime import datetime
from app import create_app
from models import db, Journey, User

app = create_app()
with app.app_context():
    # Get the admin user we just created to assign ownership
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        print("Admin user not found in PostgreSQL!")
        exit(1)

    db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'apm_backend.db')
    if not os.path.exists(db_path):
        print(f"SQLite DB not found at {db_path}")
        exit(1)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM journeys")
        rows = cursor.fetchall()

        count = 0
        for row in rows:
            # Check if journey already exists by ID or key
            existing = Journey.query.filter((Journey.id == row['id']) | (Journey.journey_key == row['journey_key'])).first()
            if existing:
                continue
                
            try:
                details_json = json.loads(row['details']) if row['details'] else {}
            except Exception:
                details_json = {}

            # Handle timestamps manually if they exist in SQLite as strings
            created_at = None
            updated_at = None
            try:
                if 'created_at' in row.keys() and row['created_at']:
                    created_at = datetime.fromisoformat(row['created_at'])
                if 'updated_at' in row.keys() and row['updated_at']:
                    updated_at = datetime.fromisoformat(row['updated_at'])
            except Exception:
                pass

            j = Journey(
                id=row['id'],
                journey_key=row['journey_key'],
                name=row['name'],
                package=row['package'],
                platform=row['platform'],
                details=details_json,
                user_id=admin.id
            )
            if created_at:
                j.created_at = created_at
            if updated_at:
                j.updated_at = updated_at
                
            db.session.add(j)
            count += 1

        db.session.commit()
        print(f"Berhasil memigrasikan {count} journeys dari SQLite ke PostgreSQL!")
    except Exception as e:
        print(f"Terjadi kesalahan: {e}")
        db.session.rollback()
    finally:
        conn.close()
