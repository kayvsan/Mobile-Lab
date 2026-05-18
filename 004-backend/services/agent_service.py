"""
Agent Service — manages remote agents and their tasks
"""
from datetime import datetime, timezone
from models import db, Agent, Device, Execution
from pathlib import Path
import os
import json

def register_agent(name: str) -> Agent:
    """Register a new agent and return it (with its API key)"""
    agent = Agent(name=name)
    db.session.add(agent)
    db.session.commit()
    return agent

def get_all_agents():
    """List all agents"""
    return Agent.query.all()

def process_heartbeat(agent_id: str, data: dict, ip_address: str):
    """Update agent status and sync its devices"""
    agent = db.session.get(Agent, agent_id)
    if not agent:
        return None

    agent.status = 'online'
    agent.last_heartbeat = datetime.now(timezone.utc)
    agent.ip_address = ip_address
    agent.hostname = data.get('hostname')
    agent.os_info = data.get('os_info')

    # Sync devices
    reported_devices = data.get('devices', [])
    reported_udids = set()

    for dev_info in reported_devices:
        udid = dev_info.get('udid')
        if not udid: continue
        reported_udids.add(udid)

        device = Device.query.filter_by(udid=udid).first()
        if device:
            device.agent_id = agent.id
            device.status = 'online'
            device.last_seen = datetime.now(timezone.utc)
            # Update metadata if provided
            device.brand = dev_info.get('brand', device.brand)
            device.model = dev_info.get('model', device.model)
            device.android_version = dev_info.get('android_version', device.android_version)
        else:
            # New device via agent
            device = Device(
                device_key=f"agent_{agent.id[:4]}_{udid}",
                udid=udid,
                name=f"{dev_info.get('brand', '')} {dev_info.get('model', '')}".strip() or f"Agent Device {udid[:6]}",
                status='online',
                last_seen=datetime.now(timezone.utc),
                agent_id=agent.id,
                brand=dev_info.get('brand'),
                model=dev_info.get('model'),
                android_version=dev_info.get('android_version'),
                platform='Android'
            )
            db.session.add(device)

    # Mark other devices for THIS agent as offline
    for device in agent.devices:
        if device.udid not in reported_udids:
            device.status = 'offline'

    db.session.commit()
    return agent

def get_pending_tasks(agent_id: str):
    """Get all queued executions for devices owned by this agent"""
    # Join Execution with Device to filter by agent_id
    tasks = Execution.query.join(Device).filter(
        Device.agent_id == agent_id,
        Execution.status == 'queued'
    ).all()
    
    return tasks

def update_execution_status(execution_id: str, status: str, error: str = None):
    """Update execution status from agent feedback"""
    execution = db.session.get(Execution, execution_id)
    if not execution:
        return False
    
    execution.status = status
    if status == 'running':
        execution.started_at = datetime.now(timezone.utc)
    elif status in ('completed', 'failed'):
        execution.finished_at = datetime.now(timezone.utc)
        if error:
            execution.error_message = error
            
    db.session.commit()
    return True
