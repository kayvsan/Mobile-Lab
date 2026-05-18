"""
Executor Service — manages background automation execution
"""
import os
import json
import subprocess
import threading
from datetime import datetime, timezone

from models import db, Journey, Execution, Report, Device
from config import Config


# Simple in-memory execution state for SSE
_execution_events = {}  # execution_id -> list of event dicts


def get_execution_events(execution_id: str) -> list:
    """Get buffered events for an execution"""
    return _execution_events.get(execution_id, [])


def _push_event(execution_id: str, event_type: str, data: dict):
    """Push event to buffer"""
    if execution_id not in _execution_events:
        _execution_events[execution_id] = []
    _execution_events[execution_id].append({
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


def start_execution(journey_id: str, device_id: str, user_id: str, app) -> Execution:
    """
    Create an Execution record and launch the automation in a background thread.
    Returns the Execution object immediately.
    """
    with app.app_context():
        # Resolve journey (could be UUID or journey_key)
        journey = db.session.get(Journey, journey_id) or \
                  Journey.query.filter_by(journey_key=journey_id).first()
        
        if not journey:
            raise ValueError(f"Journey '{journey_id}' not found")

        # Resolve device (could be UUID or device_key)
        device = db.session.get(Device, device_id) or \
                 Device.query.filter_by(device_key=device_id).first()
        
        if not device:
            raise ValueError(f"Device '{device_id}' not found")

        # Create execution record
        execution = Execution(
            journey_id=journey.id,
            device_id=device.id,
            user_id=user_id,
            status='queued',
        )
        db.session.add(execution)
        db.session.commit()

        exec_id = execution.id
        journey_id = journey.id
        device_id = device.id
        device_agent_id = device.agent_id
        
        # We need the keys for the physical execution (files/ADB)
        j_key = journey.journey_key
        d_key = device.device_key
        d_udid = device.udid

        _push_event(exec_id, "queued", {"journey_id": journey_id, "device_id": device_id})

    # DUAL MODE: Check if device is local or remote
    if device_agent_id:
        # REMOTE MODE: Just leave it as 'queued', agent will poll it
        _push_event(exec_id, "queued", {"message": "Task queued for remote agent"})
        return execution
    else:
        # LOCAL MODE: Launch background thread
        thread = threading.Thread(
            target=_run_automation,
            args=(exec_id, journey_id, device_id, user_id, j_key, d_key, d_udid, app),
            daemon=True
        )
        thread.start()
        return execution


def start_cycle_execution(device_id: str, journey_ids: list, cycles: int, interval: int, user_id: str, app) -> Execution:
    """
    Create a Cycle Execution record and launch the looped automation in a background thread.
    """
    with app.app_context():
        # Resolve device
        device = db.session.get(Device, device_id) or \
                 Device.query.filter_by(device_key=device_id).first()
        
        if not device:
            raise ValueError(f"Device '{device_id}' not found")

        # Create execution record for the cycle
        execution = Execution(
            journey_id=None, # Multiple journeys
            device_id=device.id,
            user_id=user_id,
            status='queued',
            is_cycle=True,
            cycle_params=json.dumps({
                "journey_ids": journey_ids,
                "cycles": cycles,
                "interval": interval
            })
        )
        db.session.add(execution)
        db.session.commit()

        exec_id = execution.id
        device_id = device.id
        d_key = device.device_key
        d_udid = device.udid

        _push_event(exec_id, "queued", {"is_cycle": True, "device_id": device_id, "journey_ids": journey_ids})

    # Launch background thread for cycle
    thread = threading.Thread(
        target=_run_cycle_automation,
        args=(exec_id, device_id, journey_ids, cycles, interval, user_id, d_key, d_udid, app),
        daemon=True
    )
    thread.start()

    return execution


def _sync_journey_to_file(journey: Journey):
    """Write the journey definition from DB back to the file system using journey_key"""
    journey_file = os.path.join(Config.JOURNEYS_DIR, f"{journey.journey_key}.json")
    os.makedirs(os.path.dirname(journey_file), exist_ok=True)

    journey_data = {
        "journey": {
            "id": journey.journey_key,
            "name": journey.name,
            "package": journey.package,
            "platform": journey.platform,
            "details": journey.details,
        }
    }
    with open(journey_file, 'w') as f:
        json.dump(journey_data, f, indent=2)


def _sync_device_to_file(device: Device):
    """Update/add device info in device.json for the automation project"""
    config_path = Config.DEVICE_CONFIG_PATH
    devices = {}
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                devices = json.load(f)
        except Exception:
            devices = {}
    
    # Merge/Update device info
    devices[device.device_key] = {
        "udid": device.udid,
        "device_name": device.name,
        "platform_name": device.platform,
        "platform_version": device.platform_version,
        "params": devices.get(device.device_key, {}).get("params", {})
    }
    
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    with open(config_path, 'w') as f:
        json.dump(devices, f, indent=2)


def _run_automation(execution_id: str, journey_id: str, device_id: str, user_id: str, journey_key: str, device_key: str, device_udid: str, app):
    """Background task: run the automation script and save results"""
    try:
        with app.app_context():
            # Mark as running
            execution = db.session.get(Execution, execution_id)
            execution.status = 'running'
            execution.started_at = datetime.now(timezone.utc)
            db.session.commit()
            _push_event(execution_id, "running", {"message": "Automation started"})

            # Sync device file (still needed for device config)
            device = db.session.get(Device, device_id)
            if device:
                _sync_device_to_file(device)

        # Command to execute main.py using API URL instead of file
        api_port = app.config.get('SERVER_PORT', 5000)
        api_url = f"http://localhost:{api_port}/api/journeys/{journey_id}/apm-payload"
        
        cmd = [
            Config.PYTHON_EXECUTABLE, "main.py",
            "-d", device_key,
            "--api-url", api_url,
            "--api-key", app.config.get('WEBHOOK_API_KEY', ''),
            "--exec-id", execution_id
        ]

        # Execute main.py with Popen for real-time log streaming
        process = subprocess.Popen(
            cmd,
            cwd=Config.MODULAR_APM_PATH,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Merge stderr into stdout
            text=True,
            bufsize=1  # Line buffered
        )

        stdout_lines = []
        # Read stdout line by line as it becomes available
        for line in process.stdout:
            stripped_line = line.rstrip('\n')
            stdout_lines.append(stripped_line)
            # Push real-time log event to SSE
            _push_event(execution_id, "log", {"message": stripped_line})

        # Wait for the process to complete with a timeout
        try:
            return_code = process.wait(timeout=600)
        except subprocess.TimeoutExpired:
            process.kill()
            raise

        with app.app_context():
            execution = db.session.get(Execution, execution_id)
            # Save the full (or truncated) log to the database
            full_stdout = "\n".join(stdout_lines)
            execution.stdout = full_stdout[-5000:] if full_stdout else None
            execution.return_code = return_code

            # Find latest report file (using journey_key for filename matching)
            report = _find_and_save_report(journey_key, device_id, user_id, execution_id)

            if report:
                execution.status = 'completed'
                execution.report_id = report.id
                _push_event(execution_id, "completed", {
                    "report_id": report.id,
                    "success": report.success,
                    "total_response_time": report.total_response_time,
                })
            elif return_code == 0:
                execution.status = 'completed'
                _push_event(execution_id, "completed", {
                    "message": "Finished but no report file found"
                })
            else:
                execution.status = 'failed'
                # Use the last few lines of output as the error message if something failed
                execution.error_message = "\n".join(stdout_lines[-5:]) if stdout_lines else "Non-zero exit code"
                _push_event(execution_id, "failed", {
                    "error": execution.error_message
                })

            execution.finished_at = datetime.now(timezone.utc)
            db.session.commit()

    except subprocess.TimeoutExpired:
        with app.app_context():
            execution = db.session.get(Execution, execution_id)
            execution.status = 'failed'
            execution.error_message = 'Execution timed out (10 min)'
            execution.finished_at = datetime.now(timezone.utc)
            db.session.commit()
            _push_event(execution_id, "failed", {"error": "Timeout"})

    except Exception as e:
        with app.app_context():
            execution = db.session.get(Execution, execution_id)
            if execution:
                execution.status = 'failed'
                execution.error_message = str(e)[:500]
                execution.finished_at = datetime.now(timezone.utc)
                db.session.commit()
            _push_event(execution_id, "failed", {"error": str(e)})


def _run_cycle_automation(execution_id: str, device_id: str, journey_ids: list, cycles: int, interval: int, user_id: str, device_key: str, device_udid: str, app):
    """Background task for Cycle mode: loop through journeys and cycles"""
    import time
    try:
        with app.app_context():
            execution = db.session.get(Execution, execution_id)
            execution.status = 'running'
            execution.started_at = datetime.now(timezone.utc)
            db.session.commit()
            _push_event(execution_id, "running", {"message": f"Cycle execution started: {cycles} cycles, {len(journey_ids)} journeys each."})

            # Sync device file
            device = db.session.get(Device, device_id)
            if device:
                _sync_device_to_file(device)

        api_port = app.config.get('SERVER_PORT', 5000)
        api_key = app.config.get('WEBHOOK_API_KEY', '')

        for cycle_idx in range(1, cycles + 1):
            _push_event(execution_id, "log", {"message": f"--- STARTING CYCLE {cycle_idx}/{cycles} ---"})
            
            for j_idx, j_id in enumerate(journey_ids):
                with app.app_context():
                    journey = db.session.get(Journey, j_id) or Journey.query.filter_by(id=j_id).first()
                    if not journey:
                        _push_event(execution_id, "log", {"message": f"Error: Journey {j_id} not found. Skipping."})
                        continue
                    
                    j_key = journey.journey_key
                    j_name = journey.name
                    actual_j_id = journey.id
                
                _push_event(execution_id, "log", {"message": f"Running Journey: {j_name} ({j_key})"})
                
                api_url = f"http://localhost:{api_port}/api/journeys/{actual_j_id}/apm-payload"
                
                cmd = [
                    Config.PYTHON_EXECUTABLE, "main.py",
                    "-d", device_key,
                    "--api-url", api_url,
                    "--api-key", api_key,
                    "--exec-id", execution_id
                ]

                process = subprocess.Popen(
                    cmd,
                    cwd=Config.MODULAR_APM_PATH,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1
                )

                for line in process.stdout:
                    _push_event(execution_id, "log", {"message": line.rstrip('\n')})

                process.wait(timeout=600)
                
                # Ingest report for this run
                with app.app_context():
                    report = _find_and_save_report(j_key, device_id, user_id, execution_id)
                    if report:
                        _push_event(execution_id, "log", {"message": f"Success: Report generated (ID: {report.id})"})
                
                # Between journeys or cycles
                if cycle_idx < cycles or j_idx < len(journey_ids) - 1:
                    if interval > 0:
                        _push_event(execution_id, "log", {"message": f"Waiting {interval}s interval..."})
                        time.sleep(interval)

        with app.app_context():
            execution = db.session.get(Execution, execution_id)
            execution.status = 'completed'
            execution.finished_at = datetime.now(timezone.utc)
            db.session.commit()
            _push_event(execution_id, "completed", {"message": "All cycles finished."})

    except Exception as e:
        with app.app_context():
            execution = db.session.get(Execution, execution_id)
            if execution:
                execution.status = 'failed'
                execution.error_message = str(e)[:500]
                execution.finished_at = datetime.now(timezone.utc)
                db.session.commit()
            _push_event(execution_id, "failed", {"error": str(e)})


def _find_and_save_report(journey_key: str, device_id: str, user_id: str, execution_id: str):
    """Find the latest report JSON for this journey and save to DB"""
    logs_dir = Config.LOGS_DIR
    if not os.path.exists(logs_dir):
        return None

    report_files = [
        f for f in os.listdir(logs_dir)
        if f.startswith(f"report_{journey_key}") and f.endswith(".json")
    ]

    if not report_files:
        return None

    # Get the most recent by modification time
    latest_file = max(
        [os.path.join(logs_dir, f) for f in report_files],
        key=os.path.getmtime
    )

    with open(latest_file, 'r') as f:
        report_data = json.load(f)

    # Use factory method on Report model
    report = Report.from_report_json(report_data, device_id, user_id, execution_id)
    db.session.add(report)
    db.session.flush()
    
    # Copy screenshots if any
    screenshot_paths = report.screenshots or []
    if screenshot_paths:
        import shutil
        import uuid
        
        # We will copy and rename them with UUID to avoid collisions
        saved_screenshots = []
        report_screenshots_dir = os.path.join(Config.SCREENSHOTS_DIR, report.id)
        os.makedirs(report_screenshots_dir, exist_ok=True)
        
        for spath in screenshot_paths:
            src_file = os.path.join(Config.MODULAR_APM_PATH, spath)
            if os.path.exists(src_file):
                # keep original filename or generate new? We can keep original basename
                basename = os.path.basename(spath)
                dst_file = os.path.join(report_screenshots_dir, basename)
                try:
                    shutil.copy2(src_file, dst_file)
                    saved_screenshots.append(basename)
                except Exception as e:
                    print(f"Failed to copy screenshot {src_file}: {e}")
        
        # update the report model with just the basenames (or relative paths)
        report.screenshots = saved_screenshots

    # Copy recording if any
    if report.recording:
        import shutil
        src_file = os.path.join(Config.MODULAR_APM_PATH, report.recording)
        if os.path.exists(src_file):
            recordings_dir = getattr(Config, 'RECORDINGS_DIR', os.path.join(os.path.dirname(Config.SCREENSHOTS_DIR), 'recordings'))
            os.makedirs(recordings_dir, exist_ok=True)
            basename = os.path.basename(report.recording)
            dst_file = os.path.join(recordings_dir, basename)
            try:
                shutil.copy2(src_file, dst_file)
                report.recording = basename
            except Exception as e:
                print(f"Failed to copy recording {src_file}: {e}")

    db.session.commit()

    return report
