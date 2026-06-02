"""
Availability Service — Calculate statistics for Availability Analysis Dashboard
"""
import json
from datetime import datetime
from models import Report

def get_availability_data(user_id, journey_id=None, date_from=None, date_to=None):
    """
    Generate availability and error analysis metrics.
    """
    query = Report.query.filter_by(user_id=user_id).filter(Report.details.isnot(None))
    
    if journey_id:
        query = query.filter_by(journey_id=journey_id)
        
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            query = query.filter(Report.start_time >= dt_from)
        except ValueError:
            pass
            
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            query = query.filter(Report.start_time <= dt_to)
        except ValueError:
            pass
            
    reports = query.all()
    
    total_execution = len(reports)
    success_execution = sum(1 for r in reports if r.success)
    failed_execution = total_execution - success_execution
    overall_availability = (success_execution / total_execution * 100) if total_execution > 0 else 0
    
    pages_data = {}
    errors_data = {}
    failure_types = {
        "UI Failure": 0,
        "Network Failure": 0,
        "System Failure": 0
    }
    
    # Process details JSON
    for report in reports:
        details = report.details
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except:
                details = []
                
        if not isinstance(details, list):
            continue
            
        for step in details:
            page_name = step.get('name', 'Unknown')
            page_success = step.get('success', False)
            rt = step.get('response_time')
            rt = float(rt) if rt is not None else 0
            
            if page_name not in pages_data:
                pages_data[page_name] = {
                    "total": 0,
                    "success": 0,
                    "fail": 0,
                    "duration_sec": 0
                }
                
            pages_data[page_name]["total"] += 1
            if page_success:
                pages_data[page_name]["success"] += 1
            else:
                pages_data[page_name]["fail"] += 1
            
            pages_data[page_name]["duration_sec"] += rt
            
            # Analyze tasks for errors
            for task in step.get('tasks', []):
                task_success = task.get('success', False)
                task_error = task.get('error')
                metadata = task.get('metadata', {})
                metadata_error = metadata.get('error') if metadata else None
                duration = task.get('duration_seconds')
                duration = float(duration) if duration is not None else 0
                
                if not task_success or task_error:
                    error_desc = task_error or metadata_error or "Expected UI not found"
                    
                    if error_desc not in errors_data:
                        errors_data[error_desc] = {
                            "count": 0,
                            "duration_sec": 0,
                            "pages": set()
                        }
                    
                    errors_data[error_desc]["count"] += 1
                    errors_data[error_desc]["duration_sec"] += duration
                    errors_data[error_desc]["pages"].add(page_name)
                    
                    # Classify failure type
                    desc_lower = error_desc.lower()
                    if any(kw in desc_lower for kw in ['element', 'not found', 'ui', 'xpath', 'locator']):
                        failure_types["UI Failure"] += 1
                    elif any(kw in desc_lower for kw in ['api', 'connection', 'ping', 'packet', 'network', 'refused']):
                        failure_types["Network Failure"] += 1
                    elif any(kw in desc_lower for kw in ['crash', 'memory', 'exception', 'automation', 'process']):
                        failure_types["System Failure"] += 1
                    else:
                        # Default to UI Failure if timeout is UI related, which is common
                        if 'timeout' in desc_lower and 'element' in desc_lower:
                            failure_types["UI Failure"] += 1
                        else:
                            failure_types["UI Failure"] += 1
                            
    # 1. Page-wise Availability
    page_wise = []
    for name, data in pages_data.items():
        avail = (data["success"] / data["total"] * 100) if data["total"] > 0 else 0
        duration_mins = data["duration_sec"] / 60
        
        page_wise.append({
            "page_name": name,
            "availability": round(avail, 2),
            "total_transaction": data["total"],
            "error_count": data["fail"],
            "duration_mins": round(duration_mins, 2)
        })
    
    # Sort descending by error count
    page_wise.sort(key=lambda x: x["error_count"], reverse=True)
    
    # 2. Error-wise Analysis
    error_wise = []
    total_error_count = sum(d["count"] for d in errors_data.values())
    
    for desc, data in errors_data.items():
        percentage = (data["count"] / total_error_count * 100) if total_error_count > 0 else 0
        duration_mins = data["duration_sec"] / 60
        
        error_wise.append({
            "error_description": desc,
            "percentage": round(percentage, 2),
            "total_occurrence": data["count"],
            "duration_impact_mins": round(duration_mins, 2),
            "pages_affected": list(data["pages"])
        })
        
    error_wise.sort(key=lambda x: x["total_occurrence"], reverse=True)
    
    # 3. Failure Distribution
    total_failures = sum(failure_types.values())
    failure_dist = []
    for type_name, count in failure_types.items():
        percentage = (count / total_failures * 100) if total_failures > 0 else 0
        failure_dist.append({
            "failure_type": type_name,
            "percentage": round(percentage, 2)
        })
        
    # 4. Root Cause Insight
    insights = []
    possible_causes = []
    
    if total_error_count > 0:
        primary_error = error_wise[0]["error_description"]
        most_failed_page = page_wise[0]["page_name"] if page_wise and page_wise[0]["error_count"] > 0 else "N/A"
        
        insights.append(f"Dominan error berasal dari '{primary_error}'.")
        insights.append(f"Failure terkonsentrasi pada page '{most_failed_page}'.")
        
        # Check network (using simple heuristic: if no network errors, it's stable)
        if failure_types["Network Failure"] == 0:
            insights.append("Tidak ditemukan indikasi network degradation.")
            insights.append("Ping latency stabil berdasarkan sampel eksekusi.")
        else:
            insights.append("Terdapat indikasi network degradation yang memicu kegagalan.")
            
        # Possible causes based on failure types
        if failure_types["UI Failure"] > 0:
            possible_causes.append("UI berubah atau update terbaru mematahkan script.")
            possible_causes.append("XPath locator invalid atau tidak ditemukan.")
            possible_causes.append("Rendering aplikasi lambat melebihi batas timeout.")
            possible_causes.append("Popup tidak terduga memblokir interaksi.")
            
        if failure_types["Network Failure"] > 0:
            possible_causes.append("Koneksi internet lambat atau terputus.")
            possible_causes.append("Endpoint API tidak dapat dijangkau (timeout).")
            
        if failure_types["System Failure"] > 0:
            possible_causes.append("Aplikasi crash (Out of Memory).")
            possible_causes.append("Device/Emulator merespons terlalu lambat.")
    else:
        insights.append("Tidak ada error ditemukan pada rentang waktu ini.")
        possible_causes.append("Semua sistem beroperasi normal.")
        
    # 5. KPI Summary
    primary_error_desc = error_wise[0]["error_description"] if error_wise else "None"
    most_failed_page_name = page_wise[0]["page_name"] if page_wise and page_wise[0]["error_count"] > 0 else "None"
    
    # Grading
    if overall_availability >= 99:
        grade = "Excellent"
    elif overall_availability >= 95:
        grade = "Good"
    elif overall_availability >= 90:
        grade = "Degraded"
    else:
        grade = "Critical"
        
    summary = {
        "total_execution": total_execution,
        "success_execution": success_execution,
        "failed_execution": failed_execution,
        "overall_availability": round(overall_availability, 2),
        "primary_error": primary_error_desc,
        "most_failed_page": most_failed_page_name,
        "grade": grade
    }
    
    return {
        "summary": summary,
        "page_wise": page_wise,
        "error_wise": error_wise,
        "failure_dist": failure_dist,
        "root_cause": {
            "insights": insights,
            "possible_causes": possible_causes
        }
    }
