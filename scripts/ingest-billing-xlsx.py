#!/usr/bin/env python3
"""Ingest MG446 billing data from XLSX into pg-arauco meter_monthly_billing."""
import subprocess, sys

for pkg in ['openpyxl', 'psycopg2-binary']:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

import openpyxl
import psycopg2
from datetime import date

XLSX = 'docs/porCargar/MG446_KPIs_mensuales_2025_M.xlsx'
SHEET = 'Resumen Mensual'
BUILDING = 'Parque Arauco Kennedy'
YEAR = 2025

MONTH_MAP = {
    'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
    'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
    'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12,
}

# Columns (0-indexed):
#  0: Mes, 1: N° Mes, 2: Ubicación, 3: ID Medidor
#  7: Consumo Mensual (kWh)
# 12: Consumo Energía ($kWh)
# 13: Dda. Máx. Suministrada(kW)
# 14: Dda. Máx. Hora Punta(kW)
# 15: KWH para Sistema Troncal
# 16: KWH para Serv. Público Neto
# 17: Cargo Fijo ($)
# 18: Total Neto($)
# 19: IVA ($)
# 20: Monto Exento
# 21: Total con IVA ($)

wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
ws = wb[SHEET]
rows = list(ws.iter_rows(values_only=True))

records = []
for row in rows[3:]:
    mes_name = row[0]
    if not mes_name or mes_name not in MONTH_MAP:
        continue

    records.append((
        row[3],                          # meter_id
        date(YEAR, MONTH_MAP[mes_name], 1),  # month
        BUILDING,
        row[7],   # total_kwh
        row[12],  # energia_clp
        row[13],  # dda_max_kw
        row[14],  # dda_max_punta_kw
        row[15],  # kwh_troncal
        row[16],  # kwh_serv_publico
        row[17],  # cargo_fijo_clp
        row[18],  # total_neto_clp
        row[19],  # iva_clp
        row[20],  # monto_exento_clp
        row[21],  # total_con_iva_clp
    ))

wb.close()
print(f'Filas parseadas: {len(records)}')

conn = psycopg2.connect(
    host='127.0.0.1', port=5434,
    dbname='arauco', user='postgres', password='arauco',
)
cur = conn.cursor()

cur.execute("DELETE FROM meter_monthly_billing WHERE building_name = %s", (BUILDING,))
print(f'Filas eliminadas previas: {cur.rowcount}')

SQL = """
INSERT INTO meter_monthly_billing
  (meter_id, month, building_name, total_kwh, energia_clp, dda_max_kw, dda_max_punta_kw,
   kwh_troncal, kwh_serv_publico, cargo_fijo_clp, total_neto_clp,
   iva_clp, monto_exento_clp, total_con_iva_clp)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

cur.executemany(SQL, records)
conn.commit()
print(f'Filas insertadas: {cur.rowcount}')

cur.execute("SELECT COUNT(*), COUNT(DISTINCT meter_id), COUNT(DISTINCT month) FROM meter_monthly_billing")
total, meters, months = cur.fetchone()
print(f'Verificación: {total} filas, {meters} medidores, {months} meses')

cur.execute("""
    SELECT month, COUNT(*), ROUND(SUM(total_kwh)::numeric, 0), ROUND(SUM(total_con_iva_clp)::numeric, 0)
    FROM meter_monthly_billing
    GROUP BY month ORDER BY month
""")
print('\nResumen por mes:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]} medidores, {row[2]:,.0f} kWh, ${row[3]:,.0f} CLP')

cur.close()
conn.close()
print('\nDone.')
