from app import create_app
from models import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # 1. Create all tables (will create 'agents' if missing)
    db.create_all()
    
    # 2. Add agent_id column to devices table manually for SQLite
    try:
        with db.engine.connect() as conn:
            # Check if column exists first
            result = conn.execute(text("PRAGMA table_info(devices)"))
            columns = [row[1] for row in result]
            
            if 'agent_id' not in columns:
                conn.execute(text("ALTER TABLE devices ADD COLUMN agent_id VARCHAR(36) REFERENCES agents(id)"))
                conn.commit()
                print("✓ Column agent_id successfully added to devices table.")
            else:
                print("- Column agent_id already exists.")
    except Exception as e:
        print(f"! Error during migration: {e}")

    print("✓ Migration complete.")
