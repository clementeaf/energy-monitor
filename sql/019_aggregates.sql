-- ============================================================
-- POWER Digital® — Tablas de agregados pre-calculados
-- agg_meter_hourly: agregado por hora por medidor (workhorse)
-- agg_node_daily: agregado diario por nodo de jerarquía
-- Índices en analisis para daily/monthly lookups
-- Índice parcial en readings para alarmas
-- ============================================================

BEGIN;

-- -------------------------------------------------------
-- 1. agg_meter_hourly — reemplaza el 80% de queries sobre readings
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS agg_meter_hourly (
  meter_id            VARCHAR(10)    NOT NULL REFERENCES meters(id),
  bucket              TIMESTAMPTZ    NOT NULL,
  avg_voltage_l1      NUMERIC(7,2),
  avg_voltage_l2      NUMERIC(7,2),
  avg_voltage_l3      NUMERIC(7,2),
  avg_current_l1      NUMERIC(8,3),
  avg_current_l2      NUMERIC(8,3),
  avg_current_l3      NUMERIC(8,3),
  avg_power_kw        NUMERIC(10,3)  NOT NULL,
  max_power_kw        NUMERIC(10,3)  NOT NULL,
  avg_reactive_kvar   NUMERIC(10,3),
  avg_power_factor    NUMERIC(5,3),
  avg_frequency_hz    NUMERIC(6,3),
  min_energy_kwh      NUMERIC(14,3)  NOT NULL,
  max_energy_kwh      NUMERIC(14,3)  NOT NULL,
  avg_thd_voltage     NUMERIC(5,2),
  avg_thd_current     NUMERIC(5,2),
  avg_phase_imbalance NUMERIC(5,2),
  alarm_count         SMALLINT       NOT NULL DEFAULT 0,
  reading_count       SMALLINT       NOT NULL DEFAULT 0,
  first_reading_at    TIMESTAMPTZ,
  last_reading_at     TIMESTAMPTZ,
  PRIMARY KEY (meter_id, bucket)
);

CREATE INDEX IF NOT EXISTS idx_agg_meter_hourly_bucket ON agg_meter_hourly(bucket);

COMMENT ON TABLE agg_meter_hourly IS 'Agregado por hora por medidor. Reemplaza GROUP BY sobre readings para hourly/daily queries.';

-- -------------------------------------------------------
-- 2. agg_node_daily — elimina CTEs recursivos para drill-down
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS agg_node_daily (
  node_id         VARCHAR(20)    NOT NULL,
  bucket          DATE           NOT NULL,
  total_kwh       NUMERIC(14,3)  NOT NULL DEFAULT 0,
  avg_power_kw    NUMERIC(10,3)  NOT NULL DEFAULT 0,
  peak_power_kw   NUMERIC(10,3)  NOT NULL DEFAULT 0,
  meter_count     SMALLINT       NOT NULL DEFAULT 0,
  reading_count   INTEGER        NOT NULL DEFAULT 0,
  PRIMARY KEY (node_id, bucket)
);

CREATE INDEX IF NOT EXISTS idx_agg_node_daily_bucket ON agg_node_daily(bucket);

COMMENT ON TABLE agg_node_daily IS 'Agregado diario por nodo de jerarquía. Pre-calcula el rollup del subárbol para drill-down sin CTE recursivo.';

-- -------------------------------------------------------
-- 3. Índices adicionales en analisis para lookups rápidos
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_analisis_meter_period_type
  ON analisis(meter_id, period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_analisis_building_period_type
  ON analisis(building_id, period_type, period_start);

COMMIT;

-- -------------------------------------------------------
-- 4. Índice parcial en readings para alarm queries
-- (fuera de transacción porque CONCURRENTLY no soporta BEGIN/COMMIT)
-- -------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_readings_alarm_meter_ts
  ON readings(meter_id, timestamp)
  WHERE alarm IS NOT NULL AND alarm != '';
