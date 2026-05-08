"""
Network parameter collection utilities for APM
Powered by custom analyze logic for legacy compatibility
"""
import re
import time
import json
import os
import subprocess
from typing import Dict, Any, Optional, List
from .logger import get_logger

logger = get_logger("network")

def list2dict(obj_list):
    """Recursively convert parsed list structure to nested dictionary"""
    obj_dict = {}
    i = 0
    for el in obj_list:
        if type(el) is list:
            obj_dict[str(i)] = list2dict(el)
        else:
            if el.find("=") > -1:
                ar_temp1 = el.split("=")
                obj_dict[ar_temp1[0]] = ar_temp1[1]
            else:
                obj_dict[str(i)] = el
        i += 1
    return obj_dict

def analyze(x):
    """Parse complex ADB dumpsys output strings into dictionary structure"""
    logger.debug(f"analyze() input: {x}")
    x = x.replace(',', '","')
    logger.debug(f"analyze() after comma replace: {x}")
    x = x.replace(', ', '","')
    logger.debug(f"analyze() after comma+space replace: {x}")
    x = x.replace(' ', '", "')
    logger.debug(f"analyze() after space replace: {x}")

    x = x.replace(']', '"],"')
    logger.debug(f"analyze() after ] replace: {x}")
    x = x.replace('[', '",["')
    logger.debug(f"analyze() after [ replace: {x}")

    x = x.replace(')', '"],"')
    logger.debug(f"analyze() after ) replace: {x}")
    x = x.replace('(', '",["')
    logger.debug(f"analyze() after ( replace: {x}")

    x = x.replace('}', '"],"')
    logger.debug(f"analyze() after }} replace: {x}")
    x = x.replace('{', '",["')
    logger.debug(f"analyze() after {{ replace: {x}")

    # Wrap whole string with square brackets
    x = '["'+x+'"]'
    logger.debug(f"analyze() after wrapping with brackets: {x}")

    # Remove empty entries
    x = x.replace('"",', '')
    logger.debug(f"analyze() after removing empty entries 1: {x}")
    x = x.replace(',""', '')
    logger.debug(f"analyze() after removing empty entries 2: {x}")

    try:
        # Load with JSON
        obj_list = json.loads(x)
        result = list2dict(obj_list)
        logger.debug(f"analyze() parse successful: {result}")
        return result
    except Exception as e:
        logger.debug(f"Analyze error: {e} for input: {x}")
        return "error"

class NetworkParams:
    """Collect and manage network-related parameters for APM using legacy analyze logic"""
    
    def __init__(self, device_manager):
        """Initialize with DeviceManager instance"""
        self.dm = device_manager
        self.udid = device_manager.udid
        
        # Default service name for API testing (sesuaikan dengan APK Anda)
        self.default_test_service = "net.senosoft.android.url/.HttpRequestService"
        
    def get_signal_level(self) -> Dict[str, Any]:
        """Get cellular signal information following legacy logic exactly"""
        try:
            # 1. WiFi Check
            command = (r'shell dumpsys wifi | findstr /c:"Wi-Fi is"' if os.name == "nt"
                       else r'shell dumpsys wifi | grep "Wi-Fi\ is"')
            resp = self.dm._run_adb(command)

            if resp:
                wifi_status = resp[0].strip()
                if wifi_status == "Wi-Fi is enabled":
                    return {"network_type": "WiFi", "signal_level": "99", "signal_quality": "99", "ber": "99"}

            # 2. Cellular Strength
            command = ('shell dumpsys telephony.registry | findstr /i msignalstrength' if os.name == "nt"
                       else 'shell dumpsys telephony.registry | grep -i msignalstrength')
            resp = self.dm._run_adb(command)

            if not resp: 
                return {"network_type": "", "signal_level": "99", "signal_quality": "99", "ber": "99"}

            str_temp = resp[0].strip()
            str_temp = str_temp.replace("mSignalStrength=SignalStrength:", "")
            ar_temp = analyze(str_temp)
            
            if ar_temp == "error" or "0" not in ar_temp:
                return {"network_type": "unknown", "signal_level": "0"}

            ar_temp = ar_temp["0"]

            network_type = ""
            signal_level = "99"
            signal_quality = "99"
            ber = "0"

            # Parse based on detected network technology (Legacy logic)
            if ar_temp.get("mLte") != "Invalid":
                network_type = "4G"
                signal_level = ar_temp.get("rsrp", "99")
                signal_quality = ar_temp.get("rsrq", "99")
            elif ar_temp.get("mWcdma") != "Invalid":
                network_type = "3G"
                signal_level = ar_temp.get("rscp", "99")
                signal_quality = ar_temp.get("ecno", "99")
            elif ar_temp.get("mGsm") != "Invalid":
                network_type = "2G"
                signal_level = ar_temp.get("rssi", "99")
                ber = ar_temp.get("ber", "0")
                
            return {"network_type": network_type, "signal_level": signal_level, "signal_quality": signal_quality, "ber": ber}
        except Exception as e:
            logger.warning(f"Error in get_signal_level: {e}")
            return {"network_type": "", "signal_level": "0"}

    def get_cell_id(self) -> Dict[str, Any]:
        """Get cell tower identity info using analyze-based parsing"""
        try:
            command = ('shell dumpsys telephony.registry | findstr /i mCellInfo' if os.name == "nt"
                       else 'shell dumpsys telephony.registry | grep -i mCellInfo')
            resp = self.dm._run_adb(command)

            if not resp: 
                return {"network_type": "", "cellid": 0}  # Fixed typo

            str_temp = resp[0].strip()
            ar_temp = analyze(str_temp)

            if ar_temp == "error" or "1" not in ar_temp:
                return {"network_type": "", "cellid": 0}  # Fixed typo

            network_type = ""
            cellid = "0"

            data_row = ar_temp["1"]
            
            # Check if data_row is dictionary
            if isinstance(data_row, dict):
                tech_prefix = data_row.get("0", "")

                if tech_prefix == "CellInfoLte:":
                    network_type = "4G"
                    # Try multiple possible paths for cell ID
                    cell_identity = data_row.get("1", {})
                    if isinstance(cell_identity, dict):
                        # Try different possible keys for LTE cell ID
                        cellid = (cell_identity.get("4", {}).get("mCi", "0") or
                                 cell_identity.get("4", {}).get("mCid", "0") or
                                 cell_identity.get("mCi", "0") or
                                 cell_identity.get("mCellIdentity", {}).get("mCi", "0"))
                        
                elif tech_prefix == "CellInfoWcdma:":
                    network_type = "3G"
                    cell_identity = data_row.get("1", {})
                    if isinstance(cell_identity, dict):
                        cellid = cell_identity.get("4", {}).get("mCid", "0")
                        
                elif tech_prefix == "CellInfoGsm:":
                    network_type = "2G"
                    cell_identity = data_row.get("1", {})
                    if isinstance(cell_identity, dict):
                        cellid = cell_identity.get("4", {}).get("mCid", "0")

            return {"network_type": network_type, "cellid": (0 if cellid == "0" else int(cellid))}
        except Exception as e:
            logger.warning(f"Error in get_cell_id: {e}")
            return {"network_type": "", "cellid": 0}

    def test_ping(self, host: str, num_packet: int = 4) -> Dict[str, Any]:
        """Run ping test following legacy summary parsing"""
        try:
            resp = self.dm._run_adb(f'shell ping -c {num_packet} {host}')

            if not resp: 
                return {"latency": -1, "packet_loss": -1}

            # Summary is usually second to last line
            str_summary = resp[len(resp) - 2].replace("\n", "")
            ar_summary = str_summary.split(", ")

            # packet_loss (3rd element)
            packet_loss = -1
            if len(ar_summary) >= 3:
                ar_packet_loss = ar_summary[2].split(" ")
                packet_loss = ar_packet_loss[0].replace("%","")
            
            # latency (last line)
            latency = -1
            str_statistic = resp[-1].replace("\n", "")
            ar_statistic = str_statistic.split(" ")
            if len(ar_statistic) >= 4:
                ar_number = ar_statistic[3].split("/")
                if len(ar_number) >= 2:
                    latency = float(ar_number[1])
            
            return {"latency": latency, "packet_loss": int(packet_loss)}
        except Exception as e:
            logger.error(f"Ping failed: {e}")
            return {"latency": -1, "packet_loss": -1}

    def test_api(self, api_url: str, timeout: int = 10000, test_service: str = None, 
                 udid: str = None, device_id: str = None) -> Dict[str, Any]:
        """Test API via custom Android service and logcat polling
        
        Args:
            api_url: URL endpoint to test
            timeout: Timeout in milliseconds (default: 10000)
            test_service: Service component name (e.g., "package/.Service")
            udid: Device UDID (default: self.udid)
            device_id: Device identifier for tagging (default: self.udid)
        """
        try:
            # Use default values if not provided
            if test_service is None:
                test_service = self.default_test_service
            if udid is None:
                udid = self.udid
            if device_id is None:
                device_id = self.udid
            
            millis = int(round(time.time() * 1000))
            tag = f"{device_id}-{millis}"
            logger.info(f"device_id: {device_id}")

            logger.info(f"Starting API test service with tag: {tag}")
            logger.info(f"Testing URL: {api_url}")
            logger.info(f"Service: {test_service}")
            
            # Start service dengan format yang benar
            test_service = "com.example.app/.TestService"  # Contoh lengkap
            start_cmd = f'shell am start-foreground-service -n {test_service} --es tag {tag} --es url {api_url} --ei timeout {timeout}'
            #                                          ^^^^^^                       ^^^^                       ^^^^
            #                                          --es untuk string, --ei untuk integer
            
            self.dm._run_adb(start_cmd)
            
            # Polling logcat dengan timeout
            max_attempts = 20
            for i in range(max_attempts):
                time.sleep(1)  # Tunggu log muncul
                
                # Clear buffer dulu atau gunakan -d
                command = (f'logcat -d | findstr "{tag}"' if os.name == "nt"
                           else f'logcat -d | grep "{tag}"')
                
                result = self.dm._run_adb(command)
                if result:
                    # Parse result
                    break
            else:
                # Timeout, tidak ada log ditemukan
                raise TimeoutError(f"Log with tag {tag} not found")
            
            n_seconds = 0
            max_wait = timeout/1000 + 5
            # Wait loop (legacy-like polling)
            result_output = []
            while n_seconds < max_wait:
                result_output = self.dm._run_adb(command)
                if result_output:
                    break
                time.sleep(1)
                n_seconds += 1

            if not result_output:
                logger.warning(f"No logcat output found for tag {tag}")
                return {"status": "1", "response_time": "-1", "result": "timeout"}

            # Parse JSON from logcat line
            resp_line = result_output[0]
            json_start = resp_line.find("{")
            if json_start > -1:
                json_str = resp_line[json_start:]
                ar_resp = json.loads(json_str)
                return {
                    "status": ar_resp.get("status", "1"), 
                    "response_time": ar_resp.get("response_time", "-1"), 
                    "result": ar_resp.get("result", "")
                }
            
            logger.warning(f"No JSON found in logcat line: {resp_line}")
            return {"status": "1", "response_time": "-1", "result": "parse_error"}
        except Exception as e:
            logger.error(f"API test failed: {e}")
            return {"status": "1", "response_time": "-1", "result": str(e)}

    def test_api_with_curl(self, api_url: str, timeout: int = 10) -> Dict[str, Any]:
        """Alternative API test using curl command (if available on device)"""
        try:
            # Try to use curl first
            curl_cmd = f'shell curl -s -o /dev/null -w "%{{http_code}}" --max-time {timeout} "{api_url}"'
            resp = self.dm._run_adb(curl_cmd)
            
            if resp and resp[0].strip().isdigit():
                status_code = resp[0].strip()
                return {
                    "status": status_code,
                    "response_time": "-1",
                    "result": "completed" if status_code == "200" else "failed"
                }
            
            # Fallback to ping if curl fails
            logger.warning("Curl not available, falling back to ping")
            host = api_url.replace("https://", "").replace("http://", "").split("/")[0]
            ping_result = self.test_ping(host, 4)
            
            return {
                "status": "unknown",
                "response_time": str(ping_result["latency"]),
                "result": "ping_only"
            }
        except Exception as e:
            logger.error(f"Curl API test failed: {e}")
            return {"status": "1", "response_time": "-1", "result": str(e)}

    def install_curl(self, test_apk: str = "net.senosoft.android.url.apk", 
                     test_app: str = "net.senosoft.android.url") -> bool:
        """Check for and install the CURL service APK"""
        try:
            logger.info(f"Checking CURL Service app: {test_app}")
            command = (f'shell pm list packages | findstr /i {test_app}' if os.name == "nt"
                       else f'shell pm list packages | grep -i {test_app}')
            resp = self.dm._run_adb(command)
            
            if not resp:
                logger.info("CURL Service app does not exist, installing...")
                # Try multiple possible APK locations
                possible_paths = [
                    os.path.join(os.getcwd(), "config", "apks", test_apk),
                    os.path.join(os.path.dirname(__file__), "config", "apks", test_apk),
                    os.path.join(os.getcwd(), test_apk),
                    test_apk
                ]
                
                apk_path = None
                for path in possible_paths:
                    if os.path.exists(path):
                        apk_path = path
                        break
                
                if not apk_path:
                    logger.error(f"APK not found in any of: {possible_paths}")
                    return False
                    
                logger.info(f"Installing APK from: {apk_path}")
                command = f'install -t "{apk_path}"'
                install_resp = self.dm._run_adb(command)
                
                # Check installation result
                if install_resp:
                    status_line = install_resp[1] if os.name == "nt" and len(install_resp) > 1 else install_resp[0]
                    if "Success" in status_line:
                        logger.info("CURL Service app successfully installed!")
                        return True
                    else:
                        logger.error(f"Installation failed: {install_resp}")
                        return False
                else:
                    logger.error("No response from install command")
                    return False
            else:
                logger.info("CURL Service already exists!")
                return True
        except Exception as e:
            logger.error(f"Install error: {e}")
            return False

    def get_network_info(self) -> Dict[str, Any]:
        """Get complete network information in one call"""
        try:
            signal_info = self.get_signal_level()
            cell_info = self.get_cell_id()
            
            # Merge results
            result = {
                "network_type": signal_info.get("network_type", ""),
                "signal_level": signal_info.get("signal_level", "0"),
                "signal_quality": signal_info.get("signal_quality", "0"),
                "ber": signal_info.get("ber", "0"),
                "cell_id": cell_info.get("cellid", 0)
            }
            
            # If network_type from cell_info is available and signal_info is empty, use it
            if not result["network_type"] and cell_info.get("network_type"):
                result["network_type"] = cell_info["network_type"]
                
            return result
        except Exception as e:
            logger.error(f"Error getting network info: {e}")
            return {
                "network_type": "",
                "signal_level": "0",
                "signal_quality": "0",
                "ber": "0",
                "cell_id": 0
            }

    def set_test_service(self, service_name: str):
        """Set the default test service name for API testing"""
        self.default_test_service = service_name
        logger.info(f"Test service set to: {service_name}")