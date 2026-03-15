#!/usr/bin/env python3
"""Script 3: Add 4 KPI columns to meter_monthly_billing from XLSX Resumen Mensual."""
import subprocess, sys
for pkg in ['openpyxl', 'psycopg2-binary']:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

import openpyxl
import psycopg2
from datetime import date

XLSX = 'docs/porCargar/MG446_KPIs_mensuales_2025_M.xlsx'
SHEET = 'Resumen Mensual'
YEAR = 2025

MONTH_MAP = {
    'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
    'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
    'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12,
}

conn = psycopg2.connect(host='127.0.0.1', port=5434, dbname='arauco', user='postgres', password='arauco')
cur = conn.cursor()

# --- 1. ALTER TABLE: add columns if not exist ---
for col_def in [
    'peak_mensual_kw NUMERIC(12,3)',
    'demanda_hora_punta_kwh NUMERIC(14,3)',
    'pct_punta_consumo NUMERIC(5,4)',
    'promedio_diario_kwh NUMERIC(12,3)',
]:
    col_name = col_def.split()[0]
    cur.execute(f"""
        DO $$ BEGIN
            ALTER TABLE meter_monthly_billing ADD COLUMN {col_def};
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
conn.commit()
print('Columnas KPI agregadas (o ya existían)')

# --- 2. Read XLSX ---
wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
ws = wb[SHEET]
rows = list(ws.iter_rows(values_only=True))

records = []
for row in rows[3:]:  # skip 3 header rows
    mes_name = row[0]
    if not mes_name or mes_name not in MONTH_MAP:
        continue
    meter_id = row[3]
    month = date(YEAR, MONTH_MAP[mes_name], 1)
    peak = row[8]          # Peak Mensual (kW)
    demanda = row[9]       # Demanda Hora Punta (kWh)
    pct_punta = row[10]    # % Punta / Consumo Total
    prom_diario = row[11]  # Promedio Diario (kWh)
    records.append((peak, demanda, pct_punta, prom_diario, meter_id, month))

wb.close()
print(f'Filas parseadas del XLSX: {len(records)}')

# --- 3. UPDATE ---
SQL = """
UPDATE meter_monthly_billing
SET peak_mensual_kw = %s,
    demanda_hora_punta_kwh = %s,
    pct_punta_consumo = %s,
    promedio_diario_kwh = %s
WHERE meter_id = %s AND month = %s
"""
updated = 0
for rec in records:
    cur.execute(SQL, rec)
    updated += cur.rowcount

conn.commit()
print(f'Filas actualizadas: {updated}')

# --- 4. Verification ---
cur.execute("""
    SELECT COUNT(*) FROM meter_monthly_billing
    WHERE peak_mensual_kw IS NOT NULL
""")
print(f'Filas con KPIs no-null: {cur.fetchone()[0]}')

cur.execute("""
    SELECT month, ROUND(AVG(peak_mensual_kw)::numeric, 2), ROUND(AVG(promedio_diario_kwh)::numeric, 2)
    FROM meter_monthly_billing
    WHERE peak_mensual_kw IS NOT NULL
    GROUP BY month ORDER BY month
""")
print('\nPromedio KPIs por mes:')
for row in cur.fetchall():
    print(f'  {row[0]}: peak={row[1]} kW, prom_diario={row[2]} kWh')

cur.close()
conn.close()
print('\nDone.')
