import psycopg2
import json

def flatten_extra(extra_dict):
    if not isinstance(extra_dict, dict):
        return extra_dict
        
    while 'extra' in extra_dict and isinstance(extra_dict['extra'], dict):
        inner = extra_dict.pop('extra')
        extra_dict.update(inner)
    return extra_dict

def fix_journey_details(details):
    if not isinstance(details, list):
        return details
        
    for detail in details:
        tasks = detail.get('tasks', [])
        for task in tasks:
            if 'extra' in task and isinstance(task['extra'], dict):
                task['extra'] = flatten_extra(task['extra'])
    return details

conn = psycopg2.connect('postgresql://postgres:admin@localhost:5432/apm_db')
cur = conn.cursor()

# Get all journeys
cur.execute("SELECT id, details FROM journeys")
journeys = cur.fetchall()

updated_count = 0
for j_id, details in journeys:
    if not details: continue
    
    # Process and fix nested extra
    new_details = fix_journey_details(details)
    
    # Update back to database
    cur.execute(
        "UPDATE journeys SET details = %s WHERE id = %s", 
        (json.dumps(new_details), j_id)
    )
    updated_count += 1

conn.commit()
print(f"Successfully cleaned up nested 'extra' bug in {updated_count} journeys in database.")
