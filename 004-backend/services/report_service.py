"""
Report Service — report parsing, import, and aggregation
"""
import os
import json
from datetime import datetime, timezone

from models import db, Report
from config import Config


def import_reports_from_logs(device_id: str = "unknown", user_id: str = None) -> list:
    """
    Scan 003-modular-apm/logs/ for report JSON files and import any
    that haven't been imported yet (based on start_time matching).
    Returns list of newly imported Report objects.
    """
    logs_dir = Config.LOGS_DIR
    if not os.path.exists(logs_dir):
        return []

    imported = []
    report_files = [
        f for f in os.listdir(logs_dir)
        if f.startswith("report_") and f.endswith(".json")
    ]

    for filename in report_files:
        filepath = os.path.join(logs_dir, filename)
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)

            journey_id = data.get('journey_id')
            start_time_str = data.get('start_time')

            if not journey_id or not start_time_str:
                continue

            # Check if already imported (match by journey_id + start_time)
            try:
                start_time = datetime.fromisoformat(start_time_str)
            except (ValueError, TypeError):
                continue

            existing = Report.query.filter_by(
                journey_id=journey_id,
                start_time=start_time
            ).first()

            if existing:
                continue

            report = Report.from_report_json(data, device_id, user_id)
            db.session.add(report)
            imported.append(report)

        except (json.JSONDecodeError, OSError) as e:
            print(f"Warning: Could not import {filename}: {e}")
            continue

    if imported:
        db.session.commit()

    return imported


def get_journey_stats(journey_id: str = None, user_id: str = None) -> dict:
    """
    Get aggregated statistics for reports.
    Optionally filter by journey_id.
    """
    query = Report.query
    if user_id:
        query = query.filter_by(user_id=user_id)
    if journey_id:
        query = query.filter_by(journey_id=journey_id)

    reports = query.all()

    if not reports:
        return {
            "total_runs": 0,
            "success_count": 0,
            "failure_count": 0,
            "success_rate": 0,
            "avg_response_time": 0,
            "min_response_time": 0,
            "max_response_time": 0,
            "avg_ping_latency": 0,
            "network_type_distribution": {},
        }

    success_count = sum(1 for r in reports if r.success)
    failure_count = len(reports) - success_count

    response_times = [r.total_response_time for r in reports if r.total_response_time is not None]
    ping_latencies = [r.ping_latency for r in reports if r.ping_latency is not None]

    # Network type distribution
    net_dist = {}
    for r in reports:
        nt = r.network_type or "Unknown"
        net_dist[nt] = net_dist.get(nt, 0) + 1

    return {
        "total_runs": len(reports),
        "success_count": success_count,
        "failure_count": failure_count,
        "success_rate": round(success_count / len(reports) * 100, 1) if reports else 0,
        "avg_response_time": round(sum(response_times) / len(response_times), 3) if response_times else 0,
        "min_response_time": round(min(response_times), 3) if response_times else 0,
        "max_response_time": round(max(response_times), 3) if response_times else 0,
        "avg_ping_latency": round(sum(ping_latencies) / len(ping_latencies), 3) if ping_latencies else 0,
        "network_type_distribution": net_dist,
    }


def get_detail_breakdown(report_id: str) -> list:
    """
    Parse a report's details to return per-sub-journey metrics.
    Useful for detailed performance analysis.
    """
    report = db.session.get(Report, report_id)
    if not report or not report.details:
        return []

    breakdown = []
    for detail in report.details:
        step = {
            "id": detail.get("id"),
            "name": detail.get("name"),
            "success": detail.get("success"),
            "response_time": detail.get("response_time"),
            "task_count": len(detail.get("tasks", [])),
            "network_type": detail.get("network_params", {}).get("signal_level", {}).get("network_type"),
            "ping_latency": detail.get("network_params", {}).get("test_ping", {}).get("latency"),
            "tasks": []
        }
        for task in detail.get("tasks", []):
            step["tasks"].append({
                "task_id": task.get("task_id"),
                "task_name": task.get("task_name"),
                "success": task.get("success"),
                "duration_seconds": task.get("duration_seconds"),
                "response_time": task.get("response_time"),
                "measured": task.get("measured"),
            })
        breakdown.append(step)

    return breakdown
