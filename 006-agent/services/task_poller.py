import time
import threading
import logging
import subprocess
import os
import requests
import json

logger = logging.getLogger("agent.poller")

class TaskPoller:
    """Poll server for pending tasks and execute them"""
    
    def __init__(self, api, apm_path):
        self.api = api
        self.apm_path = os.path.abspath(apm_path)
        self.running = False
        self.busy_devices = set()

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._poll_loop, daemon=True)
        self.thread.start()

    def _poll_loop(self):
        logger.info("Task poller started")
        while self.running:
            try:
                tasks = self.api.get_tasks()
                for task in tasks:
                    udid = task.get("device_udid")
                    if udid and udid not in self.busy_devices:
                        self.busy_devices.add(udid)
                        threading.Thread(target=self._execute_task, args=(task,), daemon=True).start()
            except Exception as e:
                logger.error(f"Polling error: {e}")
            
            time.sleep(3)

    def _execute_task(self, task):
        exec_id = task["id"]
        udid = task["device_udid"]
        device_key = task["device_id"]
        logger.info(f"Executing task {exec_id} on {udid} (key: {device_key})")

        try:
            # Ensure device exists in local device.json for main.py
            device_json_path = os.path.join(self.apm_path, "config", "device.json")
            devices = {}
            if os.path.exists(device_json_path):
                try:
                    with open(device_json_path, 'r') as f:
                        devices = json.load(f)
                except Exception:
                    pass
            
            if device_key not in devices:
                devices[device_key] = {
                    "udid": udid,
                    "device_name": f"Agent Device {udid}",
                    "platform_name": "Android",
                    "platform_version": "15",
                    "params": {}
                }
                os.makedirs(os.path.dirname(device_json_path), exist_ok=True)
                with open(device_json_path, 'w') as f:
                    json.dump(devices, f, indent=2)
                logger.info(f"Added device {device_key} to local device.json")

            # 1. Report start
            self.api.update_task_status(exec_id, "running")

            # 2. Run modular-apm main.py
            # Command: python main.py -d {udid} --api-url {api_url} --api-key {api_key}
            env = os.environ.copy()
            env["PYTHONPATH"] = self.apm_path
            
            process = subprocess.Popen(
                [
                    "python3", "main.py",
                    "--device", task["device_id"],
                    "--api-url", task["api_url"],
                    "--api-key", task["api_key"],
                    "--exec-id", exec_id
                ],
                cwd=self.apm_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env
            )

            # 3. Stream logs
            for line in process.stdout:
                line = line.strip()
                if line:
                    self.api.push_log(exec_id, line)

            process.wait()

            # 4. Push completion & upload results
            if process.returncode == 0:
                latest_report = self._find_latest_report()
                uploaded = False
                if latest_report:
                    uploaded = self._upload_report_and_media(exec_id, device_key, task["api_key"], latest_report)
                
                if uploaded:
                    logger.info(f"Task {exec_id} completed and uploaded successfully")
                else:
                    logger.warning(f"Task {exec_id} ran successfully but report upload failed/skipped, falling back to simple completion status")
                    self.api.update_task_status(exec_id, "completed")
            else:
                self.api.update_task_status(exec_id, "failed", error=f"Process exited with {process.returncode}")

        except Exception as e:
            logger.error(f"Task execution error: {e}")
            self.api.update_task_status(exec_id, "failed", error=str(e))
        finally:
            self.busy_devices.remove(udid)

    def _find_latest_report(self):
        logs_dir = os.path.join(self.apm_path, "logs")
        if not os.path.exists(logs_dir):
            return None
        
        report_files = [
            f for f in os.listdir(logs_dir)
            if f.startswith("report_") and f.endswith(".json")
        ]
        
        if not report_files:
            return None
            
        latest_file = max(
            [os.path.join(logs_dir, f) for f in report_files],
            key=lambda x: os.path.getmtime(os.path.join(logs_dir, x))
        )
        return os.path.join(logs_dir, latest_file)

    def _upload_report_and_media(self, exec_id, device_key, webhook_key, report_path):
        try:
            with open(report_path, 'r') as f:
                report_data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to read report {report_path}: {e}")
            return False

        summary = report_data.get("summary", {})
        
        # 1. Upload screenshots
        screenshot_paths = summary.get("screenshot_paths", [])
        for spath in screenshot_paths:
            full_path = os.path.join(self.apm_path, spath)
            if os.path.exists(full_path):
                try:
                    logger.info(f"Uploading screenshot: {spath}")
                    with open(full_path, 'rb') as f:
                        files = {'file': f}
                        data = {'execution_id': exec_id, 'type': 'screenshot'}
                        self.api.post_file("/agent/upload", files, data)
                except Exception as e:
                    logger.error(f"Failed to upload screenshot {spath}: {e}")
                    
        # 2. Upload recording
        recording_path = summary.get("recording_path")
        if recording_path:
            full_path = os.path.join(self.apm_path, recording_path)
            if os.path.exists(full_path):
                try:
                    logger.info(f"Uploading recording: {recording_path}")
                    with open(full_path, 'rb') as f:
                        files = {'file': f}
                        data = {'execution_id': exec_id, 'type': 'recording'}
                        self.api.post_file("/agent/upload", files, data)
                except Exception as e:
                    logger.error(f"Failed to upload recording {recording_path}: {e}")
                    
        # 3. Submit report JSON to webhook
        try:
            logger.info("Submitting execution report JSON to webhook...")
            response = self.api.submit_report(report_data, webhook_key, exec_id, device_key)
            if response.status_code == 201:
                logger.info("✓ Report successfully imported in backend DB")
                return True
            else:
                logger.error(f"✗ Webhook report submission failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to submit report: {e}")
            return False
