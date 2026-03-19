-- 020: Optimizaciones para queries de medidores
-- 1) Columna is_three_phase en store (elimina LATERAL sobre meter_readings)
-- 2) Tabla meter_latest_reading (cache de última lectura, refresh cada 15 min)
-- 3) Función fn_latest_readings_by_building (usa cache)

-- ============================================================
-- 1. Pre-computar fase en store
-- ============================================================
ALTER TABLE store ADD COLUMN IF NOT EXISTS is_three_phase boolean NOT NULL DEFAULT false;

UPDATE store s
SET is_three_phase = true
WHERE EXISTS (
  SELECT 1 FROM meter_readings mr
  WHERE mr.meter_id = s.meter_id
    AND mr.voltage_l2 IS NOT NULL
    AND mr.voltage_l2 != 0
  LIMIT 1
);

-- ============================================================
-- 2. Tabla cache: última lectura por medidor
-- ============================================================
CREATE TABLE IF NOT EXISTS meter_latest_reading (
  meter_id varchar(10) PRIMARY KEY,
  power_kw numeric(10,3),
  voltage_l1 numeric(7,2),
  current_l1 numeric(8,3),
  power_factor numeric(5,4),
  timestamp timestamptz
);

-- Poblado inicial
INSERT INTO meter_latest_reading (meter_id, power_kw, voltage_l1, current_l1, power_factor, timestamp)
SELECT s.meter_id, r.power_kw, r.voltage_l1, r.current_l1, r.power_factor, r.timestamp
FROM store s
LEFT JOIN LATERAL (
  SELECT power_kw, voltage_l1, current_l1, power_factor, timestamp
  FROM meter_readings
  WHERE meter_id = s.meter_id
  ORDER BY timestamp DESC
  LIMIT 1
) r ON true
ON CONFLICT (meter_id) DO UPDATE SET
  power_kw = EXCLUDED.power_kw,
  voltage_l1 = EXCLUDED.voltage_l1,
  current_l1 = EXCLUDED.current_l1,
  power_factor = EXCLUDED.power_factor,
  timestamp = EXCLUDED.timestamp;

-- ============================================================
-- 3. Función: lecturas más recientes por edificio (usa cache)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_latest_readings_by_building(p_building text)
RETURNS TABLE (
  meter_id       varchar,
  store_name     text,
  building_name  text,
  power_kw       numeric,
  voltage_l1     numeric,
  current_l1     numeric,
  power_factor   numeric,
  ts             timestamptz
)
LANGUAGE sql STABLE AS $$
  SELECT
    bm.meter_id,
    COALESCE(s.store_name, 'Por censar'),
    p_building,
    mlr.power_kw,
    mlr.voltage_l1,
    mlr.current_l1,
    mlr.power_factor,
    mlr.timestamp
  FROM (
    SELECT DISTINCT mmb.meter_id
    FROM meter_monthly_billing mmb
    WHERE mmb.building_name = p_building
  ) bm
  LEFT JOIN meter_latest_reading mlr ON mlr.meter_id = bm.meter_id
  LEFT JOIN store s ON s.meter_id = bm.meter_id
  ORDER BY bm.meter_id;
$$;
