#!/usr/bin/env python3
"""Script 4: Create tariff table and load 12 rows from XLSX Pliegos Tarifarios."""
import subprocess, sys
for pkg in ['openpyxl', 'psycopg2-binary']:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

import openpyxl
import psycopg2
from datetime import date

XLSX = 'docs/porCargar/MG446_KPIs_mensuales_2025_M.xlsx'
SHEET = 'Pliegos Tarifarios (Las Condes)'
YEAR = 2025

conn = psycopg2.connect(host='127.0.0.1', port=5434, dbname='arauco', user='postgres', password='arauco')
cur = conn.cursor()

# --- 1. Create table ---
cur.execute("""
    CREATE TABLE IF NOT EXISTS tariff (
        month DATE NOT NULL PRIMARY KEY,
        consumo_energia_kwh NUMERIC(10,3),
        dda_max_suministrada_kw NUMERIC(10,3),
        dda_max_hora_punta_kw NUMERIC(10,3),
        kwh_sistema_troncal NUMERIC(10,3),
        kwh_serv_publico_iva1 NUMERIC(10,3),
        kwh_serv_publico_iva2 NUMERIC(10,3),
        kwh_serv_publico_iva3 NUMERIC(10,3),
        kwh_serv_publico_iva4 NUMERIC(10,3),
        kwh_serv_publico_iva5 NUMERIC(10,3),
        cargo_fijo_clp NUMERIC(10,3)
    )
""")
conn.commit()
print('Tabla tariff creada (o ya existía)')

# --- 2. Read XLSX ---
wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
ws = wb[SHEET]
rows = list(ws.iter_rows(values_only=True))

records = []
for row in rows[1:]:  # skip header row
    mes_num = row[0]
    if not mes_num or not isinstance(mes_num, (int, float)):
        continue
    month = date(YEAR, int(mes_num), 1)
    records.append((
        month,
        row[1],   # consumo_energia_kwh
        row[2],   # dda_max_suministrada_kw
        row[3],   # dda_max_hora_punta_kw
        row[4],   # kwh_sistema_troncal
        row[5],   # kwh_serv_publico_iva1
        row[6],   # kwh_serv_publico_iva2
        row[7],   # kwh_serv_publico_iva3
        row[8],   # kwh_serv_publico_iva4
        row[9],   # kwh_serv_publico_iva5
        row[10],  # cargo_fijo_clp
    ))

wb.close()
print(f'Filas parseadas: {len(records)}')

# --- 3. Idempotent: DELETE + INSERT ---
cur.execute("DELETE FROM tariff")
print(f'Filas eliminadas previas: {cur.rowcount}')

SQL = """
INSERT INTO tariff
  (month, consumo_energia_kwh, dda_max_suministrada_kw, dda_max_hora_punta_kw,
   kwh_sistema_troncal, kwh_serv_publico_iva1, kwh_serv_publico_iva2,
   kwh_serv_publico_iva3, kwh_serv_publico_iva4, kwh_serv_publico_iva5, cargo_fijo_clp)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""
cur.executemany(SQL, records)
conn.commit()
print(f'Filas insertadas: {len(records)}')

# --- 4. Verification ---
cur.execute("SELECT month, consumo_energia_kwh, dda_max_suministrada_kw, cargo_fijo_clp FROM tariff ORDER BY month")
print('\nTarifas cargadas:')
for row in cur.fetchall():
    print(f'  {row[0]}: energia={row[1]}, dda_max={row[2]}, cargo_fijo={row[3]}')

cur.close()
conn.close()
print('\nDone.')
