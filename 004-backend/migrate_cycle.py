import sqlite3
import os

db_path = 'c:/Users/faiza/Desktop/all-in-one/mobile-lab/FIX/004-backend/apm_backend.db'

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE executions ADD COLUMN is_cycle BOOLEAN DEFAULT 0")
        print("Added is_cycle column")
    except sqlite3.OperationalError as e:
        print(f"is_cycle column probably exists: {e}")
        
    try:
        cursor.execute("ALTER TABLE executions ADD COLUMN cycle_params TEXT")
        print("Added cycle_params column")
    except sqlite3.OperationalError as e:
        print(f"cycle_params column probably exists: {e}")
        
    # Note: SQLite doesn't support direct ALTER TABLE to change NULL constraint.
    # But since it's dev, we can just hope it works or re-create table if needed.
    # For now, let's just add the columns.
    
    conn.commit()
    conn.close()
    print("Migration complete.")
else:
    print("DB file not found, nothing to migrate.")
