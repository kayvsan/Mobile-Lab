import os
import time
import json
import logging
import argparse
import requests
from dotenv import load_dotenv
from services.device_reporter import DeviceReporter
from services.task_poller import TaskPoller

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)-15s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("agent")

class AgentAPI:
    """Client for the server's Agent API"""
    def __init__(self, server_url, api_key):
        self.server_url = server_url.rstrip('/')
        self.api_key = api_key
        self.headers = {"X-Agent-Key": api_key}

    def heartbeat(self, payload):
        return requests.post(f"{self.server_url}/agent/heartbeat", json=payload, headers=self.headers)

    def get_tasks(self):
        response = requests.get(f"{self.server_url}/agent/tasks", headers=self.headers)
        return response.json() if response.status_code == 200 else []

    def update_task_status(self, execution_id, status, error=None):
        payload = {"status": status, "error": error}
        return requests.post(f"{self.server_url}/agent/tasks/{execution_id}/status", json=payload, headers=self.headers)

    def push_log(self, execution_id, message):
        payload = {"message": message}
        return requests.post(f"{self.server_url}/agent/tasks/{execution_id}/log", json=payload, headers=self.headers)

    def post_file(self, endpoint, files, data):
        return requests.post(f"{self.server_url}{endpoint}", files=files, data=data, headers=self.headers)

def register(server_url, name):
    """Register agent via manual command (needs admin token or prompt)"""
    print(f"Registering agent '{name}' at {server_url}...")
    # In a real scenario, this might need an admin token. 
    # For now, let's assume the user will be prompted or provide it.
    admin_token = input("Enter Admin JWT Token: ").strip()
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    try:
        response = requests.post(
            f"{server_url.rstrip('/')}/agents/register", 
            json={"name": name}, 
            headers=headers
        )
        if response.status_code == 201:
            data = response.json()
            api_key = data["api_key"]
            print(f"✓ Success! API Key: {api_key}")
            
            # Save to .env
            with open(".env", "w") as f:
                f.write(f"SERVER_URL={server_url}\n")
                f.write(f"AGENT_API_KEY={api_key}\n")
                f.write(f"AGENT_NAME={name}\n")
                f.write(f"MODULAR_APM_PATH=../003-modular-apm\n")
            print("✓ Config saved to .env")
        else:
            print(f"✗ Failed: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")

def start():
    load_dotenv()
    server_url = os.getenv("SERVER_URL")
    api_key = os.getenv("AGENT_API_KEY")
    agent_name = os.getenv("AGENT_NAME")
    apm_path = os.getenv("MODULAR_APM_PATH", "../003-modular-apm")

    if not all([server_url, api_key]):
        logger.error("Missing config in .env. Run 'python agent.py register' first.")
        return

    api = AgentAPI(server_url, api_key)
    reporter = DeviceReporter()
    poller = TaskPoller(api, apm_path)

    logger.info(f"Starting agent '{agent_name}' connected to {server_url}")
    
    # Start task poller
    poller.start()

    # Heartbeat loop
    while True:
        try:
            payload = {
                "hostname": os.uname().nodename,
                "os_info": os.uname().sysname + " " + os.uname().release,
                "devices": reporter.get_connected_devices()
            }
            resp = api.heartbeat(payload)
            if resp.status_code == 200:
                logger.info("Heartbeat sent")
            else:
                logger.warning(f"Heartbeat failed: {resp.status_code}")
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
        
        time.sleep(30)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mobile Lab Agent")
    subparsers = parser.add_subparsers(dest="command")

    # Register command
    reg_parser = subparsers.add_parser("register")
    reg_parser.add_argument("--server", required=True)
    reg_parser.add_argument("--name", required=True)

    # Start command
    subparsers.add_parser("start")

    args = parser.parse_args()

    if args.command == "register":
        register(args.server, args.name)
    elif args.command == "start":
        start()
    else:
        parser.print_help()
