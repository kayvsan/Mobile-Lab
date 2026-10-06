import psycopg2, json
conn = psycopg2.connect('postgresql://postgres:admin@localhost:5432/apm_db')
cur = conn.cursor()
cur.execute("SELECT details FROM journeys WHERE id='7110bddd-1b3c-4a34-bb40-849652570060'")
res = cur.fetchone()
if res:
    with open('journey2.json', 'w') as f:
        json.dump(res[0], f, indent=2)
else:
    print("Not found")
