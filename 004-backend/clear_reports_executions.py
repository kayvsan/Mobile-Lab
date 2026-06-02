"""
Script to clear all report and execution data from the database.
Optionally cleans up screenshots, recording videos, and modular-apm logs.
"""
import os
import shutil
from app import create_app
from models import db, Execution, Report
from config import Config

def clear_data(delete_assets=True, delete_logs=False):
    app = create_app()
    with app.app_context():
        print("\n--- DATABASE CLEANUP ---")
        try:
            # Prevent foreign key constraint issues by setting execution.report_id to None
            print("Nullifying execution report references...")
            db.session.query(Execution).update({Execution.report_id: None})
            db.session.commit()
            
            # Delete executions and reports
            print("Deleting executions...")
            num_executions = db.session.query(Execution).delete()
            print("Deleting reports...")
            num_reports = db.session.query(Report).delete()
            
            db.session.commit()
            print(f"Successfully deleted {num_executions} execution records and {num_reports} report records from the database.")
        except Exception as e:
            db.session.rollback()
            print(f"Error updating database: {e}")
            return

        if delete_assets:
            print("\n--- ASSET CLEANUP ---")
            # Clear screenshots
            screenshots_dir = Config.SCREENSHOTS_DIR
            if os.path.exists(screenshots_dir):
                print(f"Clearing screenshots in {screenshots_dir}...")
                for item in os.listdir(screenshots_dir):
                    path = os.path.join(screenshots_dir, item)
                    try:
                        if os.path.isdir(path):
                            shutil.rmtree(path)
                        else:
                            os.remove(path)
                    except Exception as e:
                        print(f"Failed to delete {path}: {e}")
            
            # Clear recordings
            recordings_dir = Config.RECORDINGS_DIR
            if os.path.exists(recordings_dir):
                print(f"Clearing recordings in {recordings_dir}...")
                for item in os.listdir(recordings_dir):
                    path = os.path.join(recordings_dir, item)
                    try:
                        if os.path.isdir(path):
                            shutil.rmtree(path)
                        else:
                            os.remove(path)
                    except Exception as e:
                        print(f"Failed to delete {path}: {e}")
            print("Asset cleanup done.")

        if delete_logs:
            print("\n--- MODULAR-APM LOGS CLEANUP ---")
            logs_dir = Config.LOGS_DIR
            if os.path.exists(logs_dir):
                print(f"Clearing JSON report logs and MP4s in {logs_dir}...")
                for item in os.listdir(logs_dir):
                    if (item.startswith("report_") and item.endswith(".json")) or (item.startswith("record_") and item.endswith(".mp4")):
                        path = os.path.join(logs_dir, item)
                        try:
                            os.remove(path)
                        except Exception as e:
                            print(f"Failed to delete log file {path}: {e}")
            print("Log cleanup done.")

if __name__ == "__main__":
    import sys
    # Ask confirmation if run interactively, or accept command line arguments
    print("Welcome to Mobile-Lab Data Cleanup Utility.")
    print("This script will delete all executions and reports.")
    
    delete_assets_input = input("Do you want to delete uploaded assets (screenshots & recordings)? (y/n) [default: y]: ").strip().lower() or 'y'
    delete_assets = delete_assets_input == 'y'

    delete_logs_input = input("Do you want to delete raw report JSON/MP4 logs from 003-modular-apm/logs/? (y/n) [default: n]: ").strip().lower() or 'n'
    delete_logs = delete_logs_input == 'y'

    confirm = input("\nAre you sure you want to proceed with deleting executions and reports? (y/n): ").strip().lower()
    if confirm == 'y':
        clear_data(delete_assets=delete_assets, delete_logs=delete_logs)
        print("\nAll done!")
    else:
        print("Aborted.")
