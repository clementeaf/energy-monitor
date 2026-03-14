#!/bin/bash
# Carga columnas mínimas del CSV y calcula resumen mensual del edificio
CSV="/Users/clementefalcone/Desktop/hoktus/energy-monitor/MALL_GRANDE_446_completo.csv"
PG="PGPASSWORD=arauco psql -h 127.0.0.1 -p 5434 -U postgres -d arauco -q"

echo "=== Creando tabla temporal ==="
eval $PG -c "
CREATE TEMP TABLE raw_load (
  timestamp TIMESTAMPTZ,
  meter_id TEXT,
  power_kw NUMERIC,
  reactive_power_kvar NUMERIC,
  power_factor NUMERIC,
  energy_kwh_total NUMERIC
);
"

echo "=== Cargando datos mínimos del CSV ==="
iconv -f latin1 -t utf-8 "$CSV" \
  | tail -n +2 \
  | cut -d';' -f1,2,17,18,19,21 \
  | sed 's/,/./g' \
  | eval $PG -c "COPY raw_load FROM STDIN WITH (DELIMITER ';', NULL '')"

echo "=== Calculando resumen mensual ==="
eval $PG -c "
INSERT INTO building_summary
SELECT
  'Parque Arauco Kennedy',
  date_trunc('month', timestamp)::date,
  43, 16, 446, 43, 403,
  SUM(delta_kwh),
  SUM(power_kw),
  AVG(power_kw),
  MAX(power_kw),
  SUM(reactive_power_kvar),
  AVG(power_factor),
  NULL
FROM (
  SELECT
    timestamp,
    meter_id,
    power_kw,
    reactive_power_kvar,
    power_factor,
    energy_kwh_total - LAG(energy_kwh_total) OVER (PARTITION BY meter_id ORDER BY timestamp) AS delta_kwh
  FROM raw_load
) sub
WHERE delta_kwh >= 0
GROUP BY date_trunc('month', timestamp)::date
ORDER BY 2;
"

echo "=== Calculando demanda máxima por mes ==="
eval $PG -c "
UPDATE building_summary bs
SET peak_demand_kw = sub.peak
FROM (
  SELECT
    date_trunc('month', timestamp)::date AS month,
    MAX(total_kw) AS peak
  FROM (
    SELECT timestamp, SUM(power_kw) AS total_kw
    FROM raw_load
    GROUP BY timestamp
  ) instant
  GROUP BY date_trunc('month', timestamp)::date
) sub
WHERE bs.month = sub.month;
"

echo "=== Resultado ==="
eval $PG -c "SELECT * FROM building_summary ORDER BY month;"
