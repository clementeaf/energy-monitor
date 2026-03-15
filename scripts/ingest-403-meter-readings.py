#!/usr/bin/env python3
"""Script 2: Create 403 partitions in meter_readings and copy from raw_readings."""
import subprocess, sys
for pkg in ['psycopg2-binary']:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

import psycopg2
import time

conn = psycopg2.connect(host='127.0.0.1', port=5434, dbname='arauco', user='postgres', password='arauco')
conn.autocommit = True
cur = conn.cursor()

BATCH_SIZE = 5000
meters = [f'MG-{i:03d}' for i in range(44, 447)]

# --- 1. Create partitions ---
print(f'Creando {len(meters)} particiones...')
for meter_id in meters:
    partition_name = f"meter_readings_{meter_id.lower().replace('-', '_')}"
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {partition_name}
        PARTITION OF meter_readings FOR VALUES IN ('{meter_id}')
    """)
print(f'Particiones creadas: {len(meters)}')

# --- 2. Copy data from raw_readings to meter_readings ---
conn.autocommit = False
total_inserted = 0
start = time.time()

for idx, meter_id in enumerate(meters):
    # Use server-side cursor for memory efficiency
    cur2 = conn.cursor(name=f'fetch_{meter_id}')
    cur2.itersize = BATCH_SIZE
    cur2.execute("""
        SELECT meter_id, timestamp, power_kw, reactive_power_kvar, power_factor, energy_kwh_total
        FROM raw_readings WHERE meter_id = %s ORDER BY timestamp
    """, (meter_id,))

    batch = []
    meter_count = 0
    for row in cur2:
        # meter_id, timestamp, v1,v2,v3, c1,c2,c3, power, reactive, pf, freq, energy
        batch.append((
            row[0], row[1],       # meter_id, timestamp
            None, None, None,     # voltage_l1, l2, l3
            None, None, None,     # current_l1, l2, l3
            row[2],               # power_kw
            row[3],               # reactive_power_kvar
            row[4],               # power_factor
            None,                 # frequency_hz
            row[5],               # energy_kwh_total
        ))
        if len(batch) >= BATCH_SIZE:
            args = ','.join(
                cur.mogrify("(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", b).decode()
                for b in batch
            )
            cur.execute(f"""
                INSERT INTO meter_readings
                (meter_id,timestamp,voltage_l1,voltage_l2,voltage_l3,current_l1,current_l2,current_l3,
                 power_kw,reactive_power_kvar,power_factor,frequency_hz,energy_kwh_total)
                VALUES {args}
                ON CONFLICT (meter_id, timestamp) DO NOTHING
            """)
            meter_count += len(batch)
            batch = []

    if batch:
        args = ','.join(
            cur.mogrify("(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", b).decode()
            for b in batch
        )
        cur.execute(f"""
            INSERT INTO meter_readings
            (meter_id,timestamp,voltage_l1,voltage_l2,voltage_l3,current_l1,current_l2,current_l3,
             power_kw,reactive_power_kvar,power_factor,frequency_hz,energy_kwh_total)
            VALUES {args}
            ON CONFLICT (meter_id, timestamp) DO NOTHING
        """)
        meter_count += len(batch)

    cur2.close()
    conn.commit()
    total_inserted += meter_count

    if (idx + 1) % 20 == 0 or idx == 0:
        elapsed = time.time() - start
        rate = total_inserted / elapsed if elapsed > 0 else 0
        print(f'  [{idx+1}/{len(meters)}] {meter_id}: {meter_count} filas | Total: {total_inserted:,} | {rate:,.0f} filas/s')

elapsed = time.time() - start
print(f'\nTotal insertado: {total_inserted:,} filas en {elapsed:.1f}s')

# --- 3. Verification ---
cur.execute("SELECT COUNT(*) FROM meter_readings")
print(f'Verificación meter_readings total: {cur.fetchone()[0]:,} filas')

cur.execute("SELECT COUNT(*) FROM pg_inherits WHERE inhparent = 'meter_readings'::regclass")
print(f'Particiones totales: {cur.fetchone()[0]}')

cur.close()
conn.close()
print('\nDone.')
