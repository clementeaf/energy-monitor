#!/usr/bin/env python3
"""Script 1: Create 403 stores (MG-044..MG-446) and generate meter_monthly from raw_readings."""
import subprocess, sys
for pkg in ['psycopg2-binary']:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

import psycopg2
from datetime import date

conn = psycopg2.connect(host='127.0.0.1', port=5434, dbname='arauco', user='postgres', password='arauco')
cur = conn.cursor()

# --- 1. Find store_type_id for "Local no sensado" ---
cur.execute("SELECT id FROM store_type WHERE name = 'Local no sensado'")
row = cur.fetchone()
if not row:
    cur.execute("INSERT INTO store_type (name) VALUES ('Local no sensado') RETURNING id")
    st_id = cur.fetchone()[0]
    print(f'Creado store_type "Local no sensado" con id={st_id}')
else:
    st_id = row[0]
    print(f'store_type "Local no sensado" ya existe con id={st_id}')

# --- 2. Insert 403 stores ---
cur.execute("DELETE FROM store WHERE meter_id >= 'MG-044' AND meter_id <= 'MG-446'")
print(f'Stores eliminados previos: {cur.rowcount}')

stores = []
for i in range(44, 447):
    meter_id = f'MG-{i:03d}'
    stores.append((meter_id, 'Local no sensado', st_id))

cur.executemany("INSERT INTO store (meter_id, store_name, store_type_id) VALUES (%s, %s, %s)", stores)
conn.commit()
print(f'Stores insertados: {len(stores)}')

# --- 3. Generate meter_monthly from raw_readings ---
cur.execute("DELETE FROM meter_monthly WHERE meter_id >= 'MG-044' AND meter_id <= 'MG-446'")
print(f'meter_monthly eliminados previos: {cur.rowcount}')
conn.commit()

# Aggregate raw_readings by meter_id and month
SQL_AGG = """
INSERT INTO meter_monthly (meter_id, month, total_kwh, avg_power_kw, peak_power_kw, total_reactive_kvar, avg_power_factor)
SELECT
    meter_id,
    date_trunc('month', timestamp)::date AS month,
    MAX(energy_kwh_total) - MIN(energy_kwh_total) AS total_kwh,
    AVG(power_kw) AS avg_power_kw,
    MAX(power_kw) AS peak_power_kw,
    AVG(reactive_power_kvar) * COUNT(*) * (15.0/60.0) AS total_reactive_kvar,
    AVG(power_factor) AS avg_power_factor
FROM raw_readings
WHERE meter_id >= 'MG-044' AND meter_id <= 'MG-446'
GROUP BY meter_id, date_trunc('month', timestamp)
ORDER BY meter_id, month
"""

print('Generando meter_monthly desde raw_readings (esto toma ~30s)...')
cur.execute(SQL_AGG)
conn.commit()
print(f'meter_monthly insertados: {cur.rowcount}')

# --- 4. Verification ---
cur.execute("SELECT COUNT(*) FROM store")
print(f'\nVerificación store: {cur.fetchone()[0]} filas (esperado: 446)')

cur.execute("SELECT COUNT(*) FROM meter_monthly")
print(f'Verificación meter_monthly: {cur.fetchone()[0]} filas (esperado: ~5352)')

cur.execute("""
    SELECT COUNT(DISTINCT meter_id), COUNT(DISTINCT month), COUNT(*)
    FROM meter_monthly WHERE meter_id >= 'MG-044'
""")
r = cur.fetchone()
print(f'  Nuevos: {r[0]} medidores, {r[1]} meses, {r[2]} filas')

cur.close()
conn.close()
print('\nDone.')
