"""Main journey executor"""
import traceback
import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from .logger import setup_logger, get_logger
from .device_manager import DeviceManager
from .utils import check_condition, load_json_file, generate_timestamp
from models.journey import Journey, JourneyDetail
from models.task import Task, TaskResult
from actions import (
    UITaskHandler, FlowTaskHandler, SystemTaskHandler,
    ScrollActionHandler, TapCoordsActionHandler
)


logger = get_logger("executor")


class JourneyExecutor:
    """Main executor for running journeys from JSON definitions"""
    
    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)
        self.device: Optional[DeviceManager] = None
        self.context: Dict[str, Any] = {
            "device": {},
            "journey": {},
            "any_param": {},
            "results": [],
            "screenshots": []
        }
        self._ar_param: Dict[str, Any] = {} # Current network snapshot
        
        self.handlers = {
            "ui": UITaskHandler,
            "within_ui": UITaskHandler,
            "do_if_ui": FlowTaskHandler,
            "back_until_ui": FlowTaskHandler,
            "do_while_ui": FlowTaskHandler,
            "app_open": SystemTaskHandler,
            "app_close": SystemTaskHandler,
            "app_clear": SystemTaskHandler,
            "wait": SystemTaskHandler,
            "tap_coords": TapCoordsActionHandler,
            "scroll": ScrollActionHandler,
            "swipe": ScrollActionHandler,
            "scroll_with_timing": ScrollActionHandler,
        }
    
    def load_device_config(self, device_id: str) -> Dict[str, Any]:
        """Load device configuration from JSON"""
        config_path = self.config_dir / "device.json"
        devices = load_json_file(config_path)
        
        device_config = devices.get(device_id)
        if not device_config:
            raise ValueError(f"Device '{device_id}' not found in {config_path}")
        
        return device_config
    
    def load_journey(self, journey_filename: str) -> tuple:
        """Load journey definition from JSON file"""
        journey_path = self.config_dir / "journeys" / journey_filename
        return Journey.from_file(str(journey_path))

    def load_journey_from_url(self, api_url: str, api_key: str = None) -> tuple:
        """Load journey definition from Backend API"""
        import requests
        headers = {}
        if api_key:
            headers['X-API-Key'] = api_key

        logger.info(f"Fetching journey from API: {api_url}")
        response = requests.get(api_url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        journey = Journey.from_dict(data.get('journey', {}))
        any_param = data.get('any_param', {})
        return journey, any_param
    
    def _execute_task(self, task: Task) -> TaskResult:
        """Execute a single task"""
        # Hook: Before execution
        self._check_network_hook(task, "before")
        
        start_time = time.time()
        
        # Check condition
        if not check_condition(task.condition, self.context):
            logger.info(f"[TASK SKIP] {task.name} -- condition not met")
            return TaskResult(task.id, task.name, True, metadata={'skipped': True})
        
        logger.info(f"[TASK] {task.name} (type={task.type}, critical={task.critical}, timeout={task.timeout}s)")
        
        handler_class = self.handlers.get(task.type)
        if not handler_class:
            return TaskResult(task.id, task.name, False, error=f"No handler for {task.type}")
        
        handler = handler_class(self.device)
        try:
            # Prepare task data for handler (resolve templates)
            from core.utils import resolve_object
            task_dict = resolve_object(task.to_dict(), self.context)
            
            result = handler.execute(task_dict, self.context)
            duration = time.time() - start_time
            
            # Response time logic
            response_time = None
            if result.get('success'):
                # 1. Calculate response time IF measure_response_time is true
                if task.measure_response_time:
                    last_ts = self.context.get('_last_success_time')
                    if last_ts:
                        wait_applied = result.get('wait_applied', 0)
                        response_time = round(time.time() - wait_applied - last_ts, 3)
                        logger.info(f"[TASK DONE] {task.name} -- response_time={response_time}s")
                
                # 2. Update baseline for the NEXT task (exclude this task's wait)
                self.context['_last_success_time'] = time.time() - result.get('wait_applied', 0)
            
            if result.get('success'):
                # Hook: After success
                self._check_network_hook(task, "after")
                
                return TaskResult(
                    task.id, task.name, True, 
                    duration_seconds=duration, 
                    response_time=response_time,
                    measured=task.measure_response_time,
                    metadata=result
                )
            else:
                error_msg = result.get('error', 'Unknown error')
                if task.critical:
                    self._take_screenshot(f"fail_{task.id}")
                # response_time remains None (null in JSON) on failure
                return TaskResult(task.id, task.name, False, error=error_msg, duration_seconds=duration, response_time=None)
                
        except Exception as e:
            import traceback
            logger.debug(f"Execution error trace: {traceback.format_exc()}")
            logger.error(f"[TASK ERROR] {task.name} -- {e}")
            if task.critical:
                self._take_screenshot(f"exc_{task.id}")
            return TaskResult(task.id, task.name, False, error=str(e))

    def _take_screenshot(self, name_prefix: str):
        """Take failure screenshot"""
        timestamp = generate_timestamp("%Y%m%d_%H%M%S")
        filepath = f"screenshots/{name_prefix}_{timestamp}.png"
        if self.device.screenshot(filepath):
            self.context['screenshots'].append(filepath)

    def _refresh_network_params(self, is_nvt: bool = False):
        """Update the internal _ar_param snapshot using refined logic"""
        # Combine settings like legacy logic
        settings = {**self.context.get('device', {}), **self.context.get('any_param', {})}
        
        self._ar_param = self.device.get_network_param(
            settings=settings,
            is_nvt=is_nvt
        )
        self.context['nvt_snapshot'] = self._ar_param # For templates

    def _check_network_hook(self, task: Task, phase: str):
        """Refresh network params if task flags match current phase"""
        if not task.record_param:
            return
            
        # Hook mapping: e.g. record_param_when="before_ui" matches phase="before" if type starts with "ui"
        hook = task.record_param_when.lower()
        if phase == "before" and hook.startswith("before"):
            self._refresh_network_params()
        elif phase == "after" and hook.startswith("after"):
            self._refresh_network_params()

    def run(self, device_id: str, journey_filename: str = None, 
            api_url: str = None, api_key: str = None) -> Dict[str, Any]:
        """Main entry point: run a journey on a device"""
        try:
            device_config = self.load_device_config(device_id)
            
            if api_url:
                journey, any_param = self.load_journey_from_url(api_url, api_key)
            elif journey_filename:
                journey, any_param = self.load_journey(journey_filename)
            else:
                return {'success': False, 'error': "No journey source specified (file or API)"}
            
            self.context['device'] = device_config
            self.context['any_param'] = any_param
            self.context['journey'] = {
                'id': journey.id,
                'name': journey.name,
                'package': journey.package,
                'activity': journey.activity
            }
            
            self.device = DeviceManager(device_config['udid'])
            if not self.device.connect():
                return {'success': False, 'error': "Device connection failed"}
            
            logger.info(f"[JOURNEY START] {journey.name} (device={device_config['udid']})")
            
            # --- START NVT & LOCATION (Legacy-like) ---
            location = self.device.get_location()
            self._refresh_network_params(is_nvt=True)
            nvt_data = self._ar_param
            # --- END NVT & LOCATION ---

            journey_result = {
                'journey_id': journey.id,
                'journey_name': journey.name,
                'location': location,
                'nvt_measurements': nvt_data,
                'details': [],
                'success': True,
                'start_time': datetime.now().isoformat()
            }
            
            # Update context for potential template use
            self.context['location'] = location
            self.context['nvt'] = nvt_data
            
            # Application start if specified in journey
            if journey.package:
                self.device.app_start(journey.package, journey.activity)
                self.context['_last_success_time'] = time.time()
                time.sleep(2)
            
            for detail in journey.details:
                # Refresh snapshot at the start of each detail
                self._refresh_network_params(is_nvt=False)
                
                detail_success = True
                detail_rt = 0.0
                detail_res = {
                    'id': detail.id, 
                    'name': detail.name, 
                    'tasks': [],
                    'success': True,
                    'response_time': None,
                    'network_params': self._ar_param.copy()
                }
                
                detail_count = len(journey.details)
                logger.info(f"[DETAIL {journey.details.index(detail) + 1}/{detail_count}] {detail.name}")
                
                for task in detail.tasks:
                    # Overide with step-level flag if necessary
                    if not detail.measure_response_time:
                        task.measure_response_time = False
                        
                    res = self._execute_task(task)
                    detail_res['tasks'].append(res.to_dict())
                    
                    if res.success and res.response_time:
                        detail_rt += res.response_time
                    
                    if not res.success and task.critical:
                        logger.error(f"[CRITICAL FAIL] Task '{task.name}' failed -- aborting journey")
                        detail_success = False
                        journey_result['success'] = False
                        break
                
                # Set detail-level results
                detail_res['success'] = detail_success
                detail_res['response_time'] = round(detail_rt, 3) if detail_success else None
                
                journey_result['details'].append(detail_res)
                if not detail_success:
                    break
            
            journey_result['end_time'] = datetime.now().isoformat()
            
            # Post-run metrics
            total_rt = 0.0
            for d in journey_result['details']:
                for t in d['tasks']:
                    if t.get('response_time'):
                        total_rt += t['response_time']
            
            journey_result['summary'] = {
                'total_response_time': round(total_rt, 3),
                'screenshots': len(self.context['screenshots']),
                'screenshot_paths': list(self.context['screenshots'])
            }
            
            return journey_result
            
        except Exception as e:
            logger.error(f"Run failed: {e}")
            logger.debug(f"Traceback: {traceback.format_exc()}")
            return {'success': False, 'error': str(e)}
        finally:
            if self.device:
                self.device.disconnect()

    def save_report(self, result: Dict[str, Any], output_dir: str = "logs") -> str:
        """Save report to JSON"""
        ts = generate_timestamp()
        filename = f"report_{result.get('journey_id', 'result')}_{ts}.json"
        filepath = Path(output_dir) / filename
        from .utils import save_json_file
        save_json_file(filepath, result)
        return str(filepath)
