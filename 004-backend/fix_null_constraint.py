import sqlite3
import os

db_path = 'c:/Users/faiza/Desktop/all-in-one/mobile-lab/FIX/004-backend/apm_backend.db'

if not os.path.exists(db_path):
    print("DB file not found.")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Starting migration to fix NULL constraint...")
    
    # Disable foreign keys temporarily
    cursor.execute("PRAGMA foreign_keys=OFF")
    
    # Create new table with nullable journey_id
    cursor.execute("""
    CREATE TABLE executions_new (
        id VARCHAR(36) NOT NULL, 
        journey_id VARCHAR(36), 
        device_id VARCHAR(36) NOT NULL, 
        user_id VARCHAR(36) NOT NULL, 
        status VARCHAR(50), 
        error_message TEXT, 
        queued_at DATETIME, 
        started_at DATETIME, 
        finished_at DATETIME, 
        report_id VARCHAR(36), 
        stdout TEXT, 
        stderr TEXT, 
        return_code INTEGER, 
        is_cycle BOOLEAN DEFAULT 0, 
        cycle_params TEXT, 
        PRIMARY KEY (id), 
        FOREIGN KEY(journey_id) REFERENCES journeys (id), 
        FOREIGN KEY(device_id) REFERENCES devices (id), 
        FOREIGN KEY(user_id) REFERENCES users (id), 
        FOREIGN KEY(report_id) REFERENCES reports (id)
    )
    """)
    
    # Copy data
    cursor.execute("""
    INSERT INTO executions_new (id, journey_id, device_id, user_id, status, error_message, queued_at, started_at, finished_at, report_id, stdout, stderr, return_code, is_cycle, cycle_params)
    SELECT id, journey_id, device_id, user_id, status, error_message, queued_at, started_at, finished_at, report_id, stdout, stderr, return_code, is_cycle, cycle_params FROM executions
    """)
    
    # Drop old table
    cursor.execute("DROP TABLE executions")
    
    # Rename new table
    cursor.execute("ALTER TABLE executions_new RENAME TO executions")
    
    # Re-enable foreign keys
    cursor.execute("PRAGMA foreign_keys=ON")
    
    conn.commit()
    print("Migration successful: executions.journey_id is now nullable.")

except Exception as e:
    conn.rollback()
    print(f"Migration failed: {e}")
finally:
    conn.close()
