
import os
import sqlite3
import uuid
from app import create_app
from models import db, User, Journey, Report, Execution

def patch():
    app = create_app()
    with app.app_context():
        # Ensure admin user exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            print("Creating admin user...")
            admin = User(username='admin', role='admin')
            admin.set_password('admin')
            db.session.add(admin)
            db.session.commit()
        
        admin_id = admin.id
        print(f"Admin User ID: {admin_id}")

        db_path = 'apm_backend.db'
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        tables_to_migrate = ['journeys', 'reports', 'executions']
        actual_migrated = []
        
        # 1. Rename tables to _old
        for table in tables_to_migrate:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [info[1] for info in cursor.fetchall()]
            
            if 'user_id' in columns:
                print(f"Table '{table}' already has 'user_id' column. Skipping renaming.")
                continue

            print(f"Renaming '{table}' to '{table}_old'...")
            cursor.execute(f"ALTER TABLE {table} RENAME TO {table}_old")
            actual_migrated.append(table)

        if not actual_migrated:
            print("Checking if we need to add 'screenshots' column to 'reports'...")
            cursor.execute("PRAGMA table_info(reports)")
            report_columns = [info[1] for info in cursor.fetchall()]
            if 'screenshots' not in report_columns:
                print("Adding 'screenshots' column to 'reports' table...")
                cursor.execute("ALTER TABLE reports ADD COLUMN screenshots JSON")
                conn.commit()
                print("Column 'screenshots' added successfully.")
            else:
                print("Column 'screenshots' already exists in 'reports'.")
                
            print("Nothing to migrate for user_id.")
            conn.close()
            return

        # 2. Create new tables with updated schema
        print("Creating new tables...")
        db.create_all()

        # 3. Copy data
        for table in actual_migrated:
            print(f"Copying data for '{table}'...")
            
            # Get column names of old table
            cursor.execute(f"PRAGMA table_info({table}_old)")
            old_cols = [info[1] for info in cursor.fetchall()]
            
            # Get column names of new table (to filter out columns that might have been removed or handle defaults)
            cursor.execute(f"PRAGMA table_info({table})")
            new_cols_info = cursor.fetchall()
            new_cols = [info[1] for info in new_cols_info]
            
            # We want to map old columns to new columns
            # user_id is the new one we fill with admin_id
            common_cols = [c for c in old_cols if c in new_cols]
            
            cursor.execute(f"SELECT {', '.join(common_cols)} FROM {table}_old")
            rows = cursor.fetchall()
            
            col_list = ", ".join(common_cols) + ", user_id"
            placeholders = ", ".join(["?"] * (len(common_cols) + 1))
            
            for row in rows:
                new_row = list(row) + [admin_id]
                cursor.execute(f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})", new_row)
            
            print(f"Data copied for '{table}'.")

        # 4. Drop old tables
        for table in actual_migrated:
            print(f"Dropping '{table}_old'...")
            cursor.execute(f"DROP TABLE {table}_old")

        conn.commit()
        conn.close()
        print("Database patch completed successfully!")

if __name__ == "__main__":
    patch()
