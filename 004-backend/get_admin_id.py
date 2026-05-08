import sqlite3
import os

db_path = 'apm_backend.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = 'admin' LIMIT 1")
    row = cursor.fetchone()
    if row:
        print(row[0])
    else:
        print("NONE")
    conn.close()
else:
    print("NO_DB")
