"""
Performance Service — Calculate statistics for Performance Analysis Dashboard
"""
from datetime import datetime
from sqlalchemy import func
from models import db, Report

def get_performance_data(user_id, journey_id=None, date_from=None, date_to=None):
    """
    Generate time-series and distribution metrics for performance analysis.
    """
    query = Report.query.filter_by(user_id=user_id).filter(Report.total_response_time.isnot(None))
    
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
    
    # 1. Response Times - Daily
    # Average per day based on start_time
    daily_data = {}
    for r in reports:
        if not r.start_time:
            continue
        # Format: DD-MMM (e.g., 19-May)
        day_key = r.start_time.strftime("%d-%b")
        if day_key not in daily_data:
            daily_data[day_key] = {"sum": 0, "count": 0}
            
        daily_data[day_key]["sum"] += r.total_response_time
        daily_data[day_key]["count"] += 1
        
    daily_rt = []
    # Sort by date (we need a way to sort properly if spanning months, but assuming linear sequential data for now based on start_time sorting before grouping)
    # Better to sort reports first
    reports_sorted_by_date = sorted([r for r in reports if r.start_time], key=lambda x: x.start_time)
    
    daily_order = []
    for r in reports_sorted_by_date:
        day_key = r.start_time.strftime("%d-%b")
        if day_key not in daily_order:
            daily_order.append(day_key)
            
    for day_key in daily_order:
        data = daily_data[day_key]
        avg_rt = data["sum"] / data["count"]
        daily_rt.append({
            "date": day_key,
            "avg_rt": round(avg_rt, 2)
        })
        
    # 2. Frequency Distribution - Response Times
    # < 3 secs (Fast), 3 - 12 secs (Tolerable), > 12 secs (Slow)
    buckets = {
        "< 3 secs (Fast)": 0,
        "3 - 12 secs (Tolerable)": 0,
        "> 12 secs (Slow)": 0
    }
    
    total_valid_reports = len(reports)
    
    for r in reports:
        rt = r.total_response_time
        if rt < 3.0:
            buckets["< 3 secs (Fast)"] += 1
        elif rt <= 12.0:
            buckets["3 - 12 secs (Tolerable)"] += 1
        else:
            buckets["> 12 secs (Slow)"] += 1
            
    frequency_dist = []
    for bucket_name, count in buckets.items():
        percentage = (count / total_valid_reports * 100) if total_valid_reports > 0 else 0
        frequency_dist.append({
            "bucket": bucket_name,
            "count": count,
            "percentage": round(percentage, 2)
        })
        
    # 3. Average Response Time - Hourly
    # Group by hour (0-23)
    hourly_data = {}
    for i in range(24):
        hourly_data[i] = {"sum": 0, "count": 0}
        
    for r in reports:
        if not r.start_time:
            continue
        hour = r.start_time.hour
        hourly_data[hour]["sum"] += r.total_response_time
        hourly_data[hour]["count"] += 1
        
    hourly_rt = []
    for hour in range(24):
        data = hourly_data[hour]
        if data["count"] > 0:
            avg_rt = data["sum"] / data["count"]
            hourly_rt.append({
                "hour": hour,
                "avg_rt": round(avg_rt, 2)
            })
            
    return {
        "daily_rt": daily_rt,
        "frequency_dist": frequency_dist,
        "hourly_rt": hourly_rt
    }
