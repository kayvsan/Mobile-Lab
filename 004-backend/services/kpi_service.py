"""
KPI Service — Calculate statistics for KPI Dashboard
"""
import json
import math
from models import db, Report

def calculate_stats(values):
    """Calculate min, median, avg, p90, max for a list of values"""
    if not values:
        return {"min": 0, "median": 0, "average": 0, "p90": 0, "max": 0}
    
    sorted_vals = sorted(values)
    count = len(sorted_vals)
    
    # Min, Max, Avg
    min_val = sorted_vals[0]
    max_val = sorted_vals[-1]
    avg_val = sum(sorted_vals) / count
    
    # Median
    mid = count // 2
    if count % 2 == 0:
        median_val = (sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0
    else:
        median_val = sorted_vals[mid]
        
    # 90th Percentile
    p90_idx = int(math.ceil(0.9 * count)) - 1
    p90_idx = max(0, min(p90_idx, count - 1))
    p90_val = sorted_vals[p90_idx]
    
    return {
        "min": round(min_val, 2),
        "median": round(median_val, 2),
        "average": round(avg_val, 2),
        "p90": round(p90_val, 2),
        "max": round(max_val, 2)
    }

def get_journey_kpi(user_id, journey_id=None, execution_id=None):
    """
    Generate Journey-wise and Page-wise KPI metrics.
    """
    query = Report.query.filter_by(user_id=user_id)
    
    if journey_id:
        query = query.filter_by(journey_id=journey_id)
    if execution_id:
        query = query.filter_by(execution_id=execution_id)
        
    reports = query.all()
    
    journey_data = {}
    page_data = {}
    
    for r in reports:
        j_id = r.journey_id
        if not j_id:
            continue
            
        if j_id not in journey_data:
            journey_data[j_id] = {
                "journey": j_id, # Actually journey_key
                "no_of_pages": 0,
                "total_cycles": 0,
                "journey_success": 0,
                "journey_error": 0,
                "response_times": []
            }
            
        jd = journey_data[j_id]
        jd["total_cycles"] += 1
        
        if r.success:
            jd["journey_success"] += 1
        else:
            jd["journey_error"] += 1
            
        if r.total_response_time is not None:
            jd["response_times"].append(r.total_response_time)
            
        # Parse details to get Page-wise data
        if r.details:
            # handle case where details is a string (JSON dumped twice in db occasionally, though Model specifies JSON)
            details_obj = r.details
            if isinstance(details_obj, str):
                try:
                    details_obj = json.loads(details_obj)
                except:
                    details_obj = []
            
            if isinstance(details_obj, list):
                # Update no_of_pages based on the maximum seen for this journey
                jd["no_of_pages"] = max(jd["no_of_pages"], len(details_obj))
                
                for step in details_obj:
                    page_name = step.get("name")
                    if not page_name:
                        continue
                        
                    if page_name not in page_data:
                        page_data[page_name] = {
                            "page_name": page_name,
                            "total_cycles": 0,
                            "page_success": 0,
                            "page_error": 0,
                            "response_times": [],
                            "network_types": [],
                            "signal_levels": [],
                            "ping_latencies": [],
                            "packet_losses": [],
                            "api_successes": []
                        }
                        
                    pd = page_data[page_name]
                    pd["total_cycles"] += 1
                    
                    if step.get("success"):
                        pd["page_success"] += 1
                    else:
                        pd["page_error"] += 1
                        
                    rt = step.get("response_time")
                    if rt is not None:
                        # try to cast to float just in case
                        try:
                            pd["response_times"].append(float(rt))
                        except (ValueError, TypeError):
                            pass
                            
                    # Extract network data
                    net_params = step.get("network_params", {})
                    
                    sig_info = net_params.get("signal_level", {})
                    if sig_info.get("signal_level"):
                        try:
                            pd["signal_levels"].append(float(sig_info.get("signal_level")))
                        except (ValueError, TypeError):
                            pass
                            
                    ping_info = net_params.get("test_ping", {})
                    if ping_info.get("packet_loss") is not None:
                        try:
                            pd["packet_losses"].append(float(ping_info.get("packet_loss")))
                        except (ValueError, TypeError):
                            pass
                            
                    api_info = net_params.get("test_api", {})
                    if api_info:
                        api_rt_str = api_info.get("response_time")
                        api_result = api_info.get("result", "")
                        try:
                            api_rt = float(api_rt_str) if api_rt_str is not None else -1
                        except (ValueError, TypeError):
                            api_rt = -1
                            
                        # Success logic mimicking nvt_service
                        if api_result not in ('timeout', 'skipped', 'parse_error') and api_rt >= 0:
                            pd["api_successes"].append(1)
                        else:
                            pd["api_successes"].append(0)

    # Finalize calculations
    
    # Journey Stats
    final_journeys = []
    for j_id, data in journey_data.items():
        stats = calculate_stats(data["response_times"])
        
        success_rate = 0
        if data["total_cycles"] > 0:
            success_rate = (data["journey_success"] / data["total_cycles"]) * 100
            
        final_journeys.append({
            "journey": data["journey"],
            "no_of_pages": data["no_of_pages"],
            "total_cycles": data["total_cycles"],
            "journey_success": data["journey_success"],
            "journey_error": data["journey_error"],
            "duration": stats,
            "success_rate_system": round(success_rate, 2),
            "success_rate_end_user": round(success_rate, 2) # Mirroring
        })
        
    # Page Stats
    final_pages = []
    for p_name, data in page_data.items():
        stats = calculate_stats(data["response_times"])
        
        success_rate = 0
        if data["total_cycles"] > 0:
            success_rate = (data["page_success"] / data["total_cycles"]) * 100
            
        # Application Performance Index (Apdex)
        # Using T=3s
        satisfied = 0
        tolerating = 0
        for rt in data["response_times"]:
            if rt <= 3.0:
                satisfied += 1
            elif rt <= 12.0:
                tolerating += 1
                
        apdex = 0
        if data["total_cycles"] > 0:
             apdex = ((satisfied + (tolerating * 0.5)) / data["total_cycles"]) * 100
             
        # NVT Calculations
        # Sig >= -85dBm
        sig_count = len(data["signal_levels"])
        sig_pass = sum(1 for s in data["signal_levels"] if s >= -85) # Note: dBm is negative, but some mock data might be positive percentage. Just doing direct >= -85 logic.
        sig_rate = (sig_pass / sig_count * 100) if sig_count > 0 else 0
        
        # Ping Success (100 - packet_loss)
        ping_count = len(data["packet_losses"])
        ping_success_sum = sum((100 - pl) for pl in data["packet_losses"])
        ping_rate = (ping_success_sum / ping_count) if ping_count > 0 else 0
        
        # API Success
        api_count = len(data.get("api_successes", []))
        api_success_sum = sum(data.get("api_successes", []))
        api_rate = (api_success_sum / api_count * 100) if api_count > 0 else 0
        
        final_pages.append({
            "page_name": data["page_name"],
            "total_cycles": data["total_cycles"],
            "page_success": data["page_success"],
            "page_error": data["page_error"],
            "response_time": stats,
            "apdex": round(apdex, 2),
            "success_rate_system": round(success_rate, 2),
            "success_rate_end_user": round(success_rate, 2), # Mirroring
            "nvt_sig": round(sig_rate, 2),
            "nvt_ping": round(ping_rate, 2),
            "nvt_api": round(api_rate, 2)
        })
        
    return {
        "journey_summary": final_journeys,
        "page_details": final_pages
    }
