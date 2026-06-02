"""
NVT Service — Network Verification Test data extraction and analysis
"""
import json
from datetime import datetime
from models import db, Report


def get_nvt_data(user_id, journey_id=None, network_type=None,
                 date_from=None, date_to=None, limit=50, offset=0):
    """
    Query reports and extract flat NVT data per report.
    Returns paginated list + summary statistics.
    """
    query = Report.query.filter_by(user_id=user_id)
    query = query.filter(Report.nvt_measurements.isnot(None))

    if journey_id:
        query = query.filter_by(journey_id=journey_id)

    if network_type:
        query = query.filter_by(network_type=network_type)

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            query = query.filter(Report.created_at >= dt_from)
        except (ValueError, TypeError):
            pass

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            query = query.filter(Report.created_at <= dt_to)
        except (ValueError, TypeError):
            pass

    total = query.count()

    reports = query.options(
        db.joinedload(Report.journey),
        db.joinedload(Report.device)
    ).order_by(Report.created_at.desc()).offset(offset).limit(limit).all()

    # Build flat NVT records
    records = []
    # Accumulators for summary
    signal_levels = []
    ping_latencies = []
    packet_losses = []
    api_success_count = 0
    api_total_count = 0

    for r in reports:
        # Get baseline NVT
        baseline_nvt = r.nvt_measurements
        if isinstance(baseline_nvt, str):
            try:
                baseline_nvt = json.loads(baseline_nvt)
            except (ValueError, TypeError):
                baseline_nvt = {}
        if not baseline_nvt:
            baseline_nvt = {}

        # Parse details
        details = r.details
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except (ValueError, TypeError):
                details = []
        if not details:
            details = []

        # Build list of NVT sources for this report
        nvt_sources = []
        if details:
            for d in details:
                net_params = d.get('network_params', {})
                # If network_params is empty, fallback to baseline
                if not net_params.get('signal_level'):
                    net_params = baseline_nvt.copy()
                else:
                    # Fallback missing api/ping to baseline for legacy compatibility
                    if 'test_ping' not in net_params and 'test_ping' in baseline_nvt:
                        net_params['test_ping'] = baseline_nvt['test_ping']
                    if 'test_api' not in net_params and 'test_api' in baseline_nvt:
                        net_params['test_api'] = baseline_nvt['test_api']

                nvt_sources.append({
                    "sub_journey_name": d.get('name', 'Unknown'),
                    "sub_journey_id": d.get('id', ''),
                    "nvt": net_params
                })
        elif baseline_nvt:
            nvt_sources.append({
                "sub_journey_name": "-",
                "sub_journey_id": "",
                "nvt": baseline_nvt
            })

        for src in nvt_sources:
            nvt = src["nvt"]
            sub_name = src["sub_journey_name"]
            sub_id = src["sub_journey_id"]

            sig_info = nvt.get('signal_level', {})
            cell_info = nvt.get('cellid', {})
            ping_info = nvt.get('test_ping', {})
            api_info = nvt.get('test_api', {})

            # Parse values safely
            sig_val = _safe_float(sig_info.get('signal_level'))
            sig_quality = _safe_float(sig_info.get('signal_quality'))
            ber_val = _safe_float(sig_info.get('ber'))
            cell_id = cell_info.get('cellid')
            cell_net_type = cell_info.get('network_type')
            ping_lat = _safe_float(ping_info.get('latency'))
            pkt_loss = _safe_float(ping_info.get('packet_loss'))
            api_status = api_info.get('status')
            api_rt = _safe_float(api_info.get('response_time'))
            api_result = api_info.get('result', '')

            # Accumulate for summary
            if sig_val is not None:
                signal_levels.append(sig_val)
            if ping_lat is not None and ping_lat >= 0:
                ping_latencies.append(ping_lat)
            if pkt_loss is not None and pkt_loss >= 0:
                packet_losses.append(pkt_loss)

            # API success tracking
            if api_info:
                api_total_count += 1
                if api_result not in ('timeout', 'skipped', 'parse_error') and api_rt is not None and api_rt >= 0:
                    api_success_count += 1

            records.append({
                "report_id": r.id,
                "journey": r.journey.name if r.journey else r.journey_id,
                "journey_id": r.journey_id,
                "sub_journey_name": sub_name,
                "sub_journey_id": sub_id,
                "device": r.device.name if r.device else r.device_id,
                "device_id": r.device_id,
                "success": r.success,
                "network_type": sig_info.get('network_type', r.network_type),
                "signal_level": sig_val,
                "signal_quality": sig_quality,
                "ber": ber_val,
                "cell_id": cell_id,
                "cell_network_type": cell_net_type,
                "ping_latency": ping_lat,
                "packet_loss": pkt_loss,
                "api_status": api_status,
                "api_response_time": api_rt,
                "api_result": api_result if api_result else ("ok" if api_info else "-"),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })

    # Build summary
    summary = {
        "avg_signal": round(sum(signal_levels) / len(signal_levels), 1) if signal_levels else None,
        "avg_ping": round(sum(ping_latencies) / len(ping_latencies), 1) if ping_latencies else None,
        "avg_packet_loss": round(sum(packet_losses) / len(packet_losses), 2) if packet_losses else None,
        "api_success_rate": round((api_success_count / api_total_count) * 100, 1) if api_total_count > 0 else None,
        "total_records": total,
        "signal_good_count": sum(1 for s in signal_levels if s >= -85),
        "signal_total_count": len(signal_levels),
    }

    return {
        "summary": summary,
        "data": records,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def _safe_float(val):
    """Safely convert a value to float, returning None on failure."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
