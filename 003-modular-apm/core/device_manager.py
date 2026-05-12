"""Device management wrapper for uiautomator2 and ADB"""
import subprocess
import time
import re
import os
from typing import Optional, Dict, List, Union, Any
from pathlib import Path

import uiautomator2 as u2
from adbutils import adb

from .logger import get_logger
from .utils import calculate_element_center
from .network import NetworkParams, analyze


logger = get_logger("device_manager")


class DeviceManager:
    """Wrapper class for Android device operations using uiautomator2 and ADB"""
    
    def __init__(self, udid: str):
        self.udid = udid
        self.d: Optional[u2.Device] = None
        self._connected = False
        self.screen_size = {"width": 0, "height": 0}
        self.window_size = {"width": 0, "height": 0}
        
    def connect(self, timeout: int = 30) -> bool:
        """Connect to Android device"""
        try:
            logger.info(f"[DEVICE] Connecting to device: {self.udid}...")
            
            # Verify device via ADB
            devices = adb.device_list()
            if not any(d.serial == self.udid for d in devices):
                logger.error(f"Device {self.udid} not found in ADB devices")
                return False
            
            self.d = u2.connect(self.udid)
            
            # Wait for device to be ready
            start_time = time.time()
            while time.time() - start_time < timeout:
                try:
                    self.d.info
                    self._connected = True
                    break
                except:
                    time.sleep(1)
            
            if not self._connected:
                logger.error(f"Failed to connect to device within {timeout}s")
                return False
            
            # Initialize sizes
            self.screen_size = self._get_screen_size()
            self.window_size = self._get_window_size()
            
            logger.info(f"[DEVICE] Connected successfully -- screen={self.screen_size['width']}x{self.screen_size['height']}, window={self.window_size['width']}x{self.window_size['height']}")
            return True
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from device"""
        if self.d:
            try:
                self.d.close()
            except:
                pass
        self._connected = False
        logger.info(f"[DEVICE] Disconnected from {self.udid}")
    
    def _run_adb(self, command: str, timeout: int = 30) -> List[str]:
        """Run ADB command and return output lines"""
        try:
            cmd = f"adb -s {self.udid} {command}"
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.stdout.strip().split('\n') if result.stdout.strip() else []
        except Exception as e:
            logger.error(f"ADB command error: {e}")
            return []
    
    def _get_screen_size(self) -> Dict[str, int]:
        """Get physical screen size"""
        resp = self._run_adb("shell wm size")
        if resp and ':' in resp[0]:
            try:
                size_part = resp[0].split(':')[-1].strip().split()[0]
                w, h = size_part.split('x')
                return {"width": int(w), "height": int(h)}
            except:
                pass
        return {"width": 0, "height": 0}
    
    def _get_window_size(self) -> Dict[str, int]:
        """Get current window/display size from uiautomator2"""
        try:
            info = self.d.info
            return {
                "width": info.get("displayWidth", 0),
                "height": info.get("displayHeight", 0)
            }
        except:
            return self.screen_size
    
    def find_element(self, find_by: str, content: str, timeout: int = 30) -> Optional[any]:
        """Find element based on type and content"""
        try:
            xpath = f'//*[@resource-id="{content}"]' if find_by == 'id' else content
            selector = self.d.xpath(xpath)
            if selector.wait(timeout):
                return selector
            return None
        except Exception as e:
            logger.debug(f"Element find error: {content} - {e}")
            return None

    def tap_element(self, selector) -> bool:
        """Tap element"""
        try:
            selector.click()
            return True
        except Exception as e:
            logger.warning(f"Tap failed: {e}")
            return False
            
    def tap_coordinates(self, x: int, y: int) -> bool:
        """Tap at specific screen coordinates"""
        try:
            self._run_adb(f"shell input tap {x} {y}")
            return True
        except Exception as e:
            logger.warning(f"Coordinate tap failed: {e}")
            return False
    
    def swipe_ext(self, direction: str, scale: float = 0.6):
        """Advanced swipe using uiautomator2's swipe_ext"""
        try:
            self.d.swipe_ext(direction, scale=scale)
            return True
        except Exception as e:
            logger.warning(f"Swipe ext failed: {e}")
            return False

    def input_via_adb(self, text: str) -> bool:
        """Input text via ADB shell (blind input)"""
        try:
            # Simple escape for spaces (ADB uses %s or just quotes)
            escaped = text.replace(' ', '%s')
            self._run_adb(f'shell input text "{escaped}"')
            return True
        except Exception as e:
            logger.warning(f"ADB input failed: {e}")
            return False

    def send_keys(self, text: str) -> bool:
        """Send text input to focused field"""
        try:
            self.d.send_keys(text)
            return True
        except Exception as e:
            logger.warning(f"Send keys failed: {e}")
            return False
    
    def app_start(self, package: str, activity: Optional[str] = None, use_monkey: bool = False) -> bool:
        """Start application"""
        try:
            if use_monkey:
                self.d.app_start(package, use_monkey=True)
            elif activity:
                self.d.app_start(package, activity)
            else:
                self.d.app_start(package)
            return True
        except Exception as e:
            logger.error(f"App start failed: {e}")
            return False
    
    def app_stop(self, package: str) -> bool:
        """Stop application"""
        try:
            self.d.app_stop(package)
            return True
        except:
            return False
            
    def app_clear(self, package: str) -> bool:
        """Clear application data"""
        try:
            self.d.app_clear(package)
            return True
        except:
            return False

    def press_back(self) -> bool:
        """Press back button"""
        try:
            self.d.press("back")
            return True
        except:
            return False
            
    def screenshot(self, filepath: str) -> bool:
        """Take screenshot and save to file"""
        try:
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            self.d.screenshot(filepath)
            return True
        except Exception as e:
            logger.error(f"Screenshot failed: {e}")
            return False

    def get_location(self) -> Dict[str, Any]:
        """Get device GPS coordinates using analyze-based parsing"""
        result = {"lat": "0", "long": "0"}
        try:
            command = (r'shell dumpsys location | findstr /c:": Location"' if os.name == "nt"
                       else r'shell dumpsys location | grep ":\ Location"')
            resp = self._run_adb(command)
            if not resp: return result
            
            str_temp = resp[0].strip()
            ar_temp = analyze(str_temp)
            if ar_temp == "error" or "2" not in ar_temp:
                return result
                
            loc_data = ar_temp["2"]
            result = {
                "type": loc_data.get("0", "unknown"),
                "lat": loc_data.get("1", "0"),
                "long": loc_data.get("2", "0")
            }
            logger.info(f"[DEVICE] Location captured: lat={result['lat']}, long={result['long']} (type={result.get('type', 'unknown')})")
        except Exception as e:
            logger.warning(f"Failed to get location: {e}")
        return result

    def start_recording(self, remote_path: str = "/sdcard/journey_record.mp4") -> bool:
        """Start screen recording"""
        try:
            self.stop_recording() # Ensure no previous recording
            self._run_adb(f"shell rm {remote_path}") # Clean old file if exists
            
            # Use --time-limit 1200 (20 minutes). Default is 180s.
            cmd = f"adb -s {self.udid} shell screenrecord --time-limit 1200 {remote_path}"
            self._recording_process = subprocess.Popen(
                cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            self._remote_recording_path = remote_path
            logger.info(f"[DEVICE] Started recording to {remote_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to start recording: {e}")
            return False

    def stop_recording(self, local_path: Optional[str] = None) -> bool:
        """Stop screen recording and optionally pull it"""
        if hasattr(self, '_recording_process') and self._recording_process:
            try:
                # Need to send SIGINT to stop screenrecord gracefully so it saves the mp4 headers
                # but Popen with shell=True is tricky.
                # It's better to just kill the screenrecord process via adb
                self._run_adb("shell pkill -2 screenrecord")
                self._recording_process.wait(timeout=5)
            except Exception as e:
                logger.warning(f"Error stopping recording process: {e}")
            finally:
                self._recording_process = None
                
            time.sleep(2) # Give it time to finish saving the file on device
            
            if local_path and hasattr(self, '_remote_recording_path'):
                try:
                    Path(local_path).parent.mkdir(parents=True, exist_ok=True)
                    self._run_adb(f"pull {self._remote_recording_path} {local_path}")
                    self._run_adb(f"shell rm {self._remote_recording_path}")
                    logger.info(f"[DEVICE] Recording pulled to {local_path}")
                    return True
                except Exception as e:
                    logger.error(f"Failed to pull recording: {e}")
        return False

    def get_network_param(self, settings: Dict[str, Any], is_nvt: bool = False) -> Dict[str, Any]:
        """
        Collect network parameters matching legacy logic exactly.
        is_nvt=True includes API test and uses NVT-specific ping count.
        """
        collector = NetworkParams(self)
        obj_return = {}
        
        mode = "NVT" if is_nvt else "Journey"
        logger.info(f"[NETWORK] Collecting {mode} measurements for {self.udid}...")
        
        # 1. Signal & CellID
        obj_return["signal_level"] = collector.get_signal_level()
        obj_return["cellid"] = collector.get_cell_id()
        
        # 2. Test API (NVT Only) - Disabled for now
        if is_nvt:
            # device_id = settings.get("id", self.udid) 
            # test_service = settings.get("test_api_service")
            # api_timeout = int(settings.get("test_api_timeout", 30000))
            
            # obj_return["test_api"] = collector.test_api(
            #     api_url="8.8.8.8",
            #     timeout=api_timeout,
            #     test_service=test_service,
            #     udid=self.udid,
            #     device_id=device_id
            # )
            obj_return["test_api"] = {"status": "1", "response_time": "-1", "result": "skipped"}
        
        # 3. Ping (Dynamic packets)
        if is_nvt:
            num_paket = int(settings.get("test_ping_num_packet_nvt", 3))
        else:
            num_paket = int(settings.get("test_ping_num_packet_journey", 3))
            
        ping_host = settings.get("test_ping_host", "8.8.8.8")
        obj_return["test_ping"] = collector.test_ping(ping_host, num_paket)
        
        return obj_return
