import subprocess
import json
import logging
from adbutils import adb

logger = logging.getLogger("agent.reporter")

class DeviceReporter:
    """Discover local ADB devices and report to server"""
    
    def get_connected_devices(self):
        """Run adb devices + getprop for each"""
        devices = []
        try:
            for d in adb.device_list():
                udid = d.serial
                try:
                    # Get basic properties
                    brand = d.shell("getprop ro.product.brand").strip()
                    model = d.shell("getprop ro.product.model").strip()
                    version = d.shell("getprop ro.build.version.release").strip()
                    
                    devices.append({
                        "udid": udid,
                        "brand": brand or "Unknown",
                        "model": model or "Device",
                        "android_version": version or "Unknown"
                    })
                except Exception as e:
                    logger.error(f"Failed to get properties for {udid}: {e}")
                    devices.append({"udid": udid, "status": "online"})
        except Exception as e:
            logger.error(f"ADB error: {e}")
            
        return devices
