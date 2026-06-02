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
        logger.info(f"Executing task {exec_id} on {udid}")

        try:
            # 1. Report start
            self.api.update_task_status(exec_id, "running")

            # 2. Run modular-apm main.py
            # Command: python main.py -d {udid} --api-url {api_url} --api-key {api_key}
            env = os.environ.copy()
            env["PYTHONPATH"] = self.apm_path
            
            process = subprocess.Popen(
                [
                    "python3", "main.py",
                    "--device", udid,
                    "--payload-url", task["api_url"],
                    "--api-key", task["api_key"]
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

            # 4. Push completion (results are usually sent by the script itself via webhook, 
            # but we can verify here if needed)
            if process.returncode == 0:
                self.api.update_task_status(exec_id, "completed")
            else:
                self.api.update_task_status(exec_id, "failed", error=f"Process exited with {process.returncode}")

        except Exception as e:
            logger.error(f"Task execution error: {e}")
            self.api.update_task_status(exec_id, "failed", error=str(e))
        finally:
            self.busy_devices.remove(udid)
