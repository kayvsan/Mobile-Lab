"""
Device Service — ADB device discovery and status management
"""
import json
import subprocess
from datetime import datetime, timezone
from urllib.parse import quote

from models import db, Device
from config import Config

def generate_scrcpy_url(udid, player='mse', host='100.81.129.118', port=None):
    """
    Generate streaming URL for ws-scrcpy
    """
    host = host or Config.SCRCPY_HOST
    port = port or Config.SCRCPY_PORT
    base = f"http://{host}:{port}"
    
    # Build WebSocket URL (encoded for query param)
    ws_params = f"action=proxy-adb&remote=tcp%3A8886&udid={udid}"
    ws_url = f"ws://{host}:{port}/?{ws_params}"
    ws_encoded = quote(ws_url, safe='')
    
    # Format output: http://HOST:PORT/#!action=stream&udid=UDID&player=mse&ws=ENCODED_WS_URL
    
    # Build final URL with hash fragment
    return f"{base}/#!action=stream&udid={udid}&player={player}&ws={ws_encoded}"

def generate_inspect_url(udid, host=None, port=None):
    """
    Generate inspection URL for device
    """
    host = host or Config.INSPECT_HOST
    port = port or Config.INSPECT_PORT
    return f"http://{host}:{port}/android/{udid}"

def get_device_properties(udid):
    """
    Fetch device properties using adb shell getprop
    """
    props = {
        'brand': '',
        'model': '',
        'manufacturer': '',
        'android_version': '',
        'sdk_version': '',
        'type_os': 'android'
    }
    
    prop_mapping = {
        'ro.product.brand': 'brand',
        'ro.product.model': 'model',
        'ro.product.manufacturer': 'manufacturer',
        'ro.build.version.release': 'android_version',
        'ro.build.version.sdk': 'sdk_version'
    }
    
    try:
        # Run multiple getprop at once or individually? 
        # Individually is safer for parsing but slower. 
        # Let's try to get all at once.
        result = subprocess.run(
            ['adb', '-s', udid, 'shell', 'getprop'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            lines = result.stdout.splitlines()
            for line in lines:
                for prop_key, map_key in prop_mapping.items():
                    if f"[{prop_key}]:" in line:
                        value = line.split(': [')[1].strip(']')
                        props[map_key] = value
    except Exception as e:
        print(f"Error fetching properties for {udid}: {e}")
        
    return props

def load_devices_from_config() -> list:
    """(Legacy) Load devices from config/device.json and sync to DB"""
    config_path = Config.DEVICE_CONFIG_PATH

    if not config_path or not os.path.exists(config_path):
        return []

    try:
        with open(config_path, 'r') as f:
            devices_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        return []

    synced = []
    for dev_key, device_info in devices_data.items():
        existing = Device.query.filter_by(device_key=dev_key).first()
        if existing:
            existing.udid = device_info.get('udid', existing.udid)
            existing.name = device_info.get('device_name', existing.name)
        else:
            device = Device(
                device_key=dev_key,
                udid=device_info.get('udid', ''),
                name=device_info.get('device_name', dev_key),
            )
            db.session.add(device)
            existing = device
        synced.append(existing)

    db.session.commit()
    return synced

def refresh_device_status() -> list:
    """
    Run `adb devices` to discover devices, update DB, and fetch metadata.
    """
    import os # Needed for load_devices_from_config if still used
    
    connected_udids = set()
    try:
        result = subprocess.run(
            ['adb', 'devices'],
            capture_output=True,
            text=True,
            timeout=10
        )
        for line in result.stdout.strip().split('\n')[1:]:
            parts = line.strip().split('\t')
            if len(parts) == 2 and parts[1] == 'device':
                connected_udids.add(parts[0])
    except (subprocess.SubprocessError, FileNotFoundError):
        pass

    # Update/Create devices in DB based on ADB discovery
    # Find all devices that match the connected UDIDs
    existing_devices = Device.query.filter(Device.udid.in_(connected_udids)).all() if connected_udids else []
    db_udids = {d.udid: d for d in existing_devices}

    for udid in connected_udids:
        if udid in db_udids:
            device = db_udids[udid]
            device.status = 'online'
            device.last_seen = datetime.now(timezone.utc)
            
            # If it was an agent device, it's now LOCAL
            device.agent_id = None 
            
            # Update properties if missing
            if not device.brand or not device.model:
                props = get_device_properties(udid)
                device.brand = props['brand']
                device.model = props['model']
                device.manufacturer = props['manufacturer']
                device.android_version = props['android_version']
                device.sdk_version = props['sdk_version']
                device.type_os = props['type_os']
                device.platform_version = props['android_version']
        else:
            # Check if it exists at all (even if not in current connected batch)
            # to be doubly sure about unique constraints
            device = Device.query.filter_by(udid=udid).first()
            if device:
                device.status = 'online'
                device.last_seen = datetime.now(timezone.utc)
                device.agent_id = None
            else:
                # New local device found!
                props = get_device_properties(udid)
                new_device = Device(
                    device_key=f"adb_{udid}",
                    udid=udid,
                    name=f"{props['brand']} {props['model']}".strip() or f"Device {udid[:6]}",
                    status='online',
                    last_seen=datetime.now(timezone.utc),
                    brand=props['brand'],
                    model=props['model'],
                    manufacturer=props['manufacturer'],
                    android_version=props['android_version'],
                    sdk_version=props['sdk_version'],
                    type_os=props['type_os'],
                    platform='Android',
                    platform_version=props['android_version'],
                    agent_id=None # explicitly local
                )
                db.session.add(new_device)

    # Mark other LOCAL devices as offline
    # (Devices that are NOT in the connected list AND have agent_id=None)
    all_local_devices = Device.query.filter_by(agent_id=None).all()
    for device in all_local_devices:
        if device.udid not in connected_udids:
            device.status = 'offline'

    db.session.commit()
    return Device.query.all()
