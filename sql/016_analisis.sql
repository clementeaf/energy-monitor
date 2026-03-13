-- ============================================================
-- POWER Digital® — Tabla Análisis (agregados precalculados)
-- Consumo total, promedio, pico por edificio/tienda/medidor y período. Sin datos, solo estructura.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS analisis (
  id               SERIAL         PRIMARY KEY,
  building_id      VARCHAR(50)    NULL REFERENCES buildings(id) ON DELETE CASCADE,
  tienda_id        INTEGER        NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  meter_id         VARCHAR(10)    NULL REFERENCES meters(id) ON DELETE CASCADE,
  period_type      VARCHAR(20)    NOT NULL,
  period_start     TIMESTAMPTZ    NOT NULL,
  period_end       TIMESTAMPTZ    NOT NULL,
  consumption_kwh  NUMERIC(14,3)  NULL,
  avg_power_kw     NUMERIC(10,3)  NULL,
  peak_demand_kw   NUMERIC(10,3)  NULL,
  num_readings     INTEGER        NULL,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_analisis_scope CHECK (
    (building_id IS NOT NULL AND tienda_id IS NULL AND meter_id IS NULL) OR
    (building_id IS NULL AND tienda_id IS NOT NULL AND meter_id IS NULL) OR
    (building_id IS NULL AND tienda_id IS NULL AND meter_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_analisis_building ON analisis(building_id);
CREATE INDEX IF NOT EXISTS idx_analisis_tienda ON analisis(tienda_id);
CREATE INDEX IF NOT EXISTS idx_analisis_meter ON analisis(meter_id);
CREATE INDEX IF NOT EXISTS idx_analisis_period ON analisis(period_type, period_start, period_end);

COMMENT ON TABLE analisis IS 'Agregados precalculados por edificio, tienda o medidor y período (día/semana/mes). Rellena con job o script desde readings.';
COMMENT ON COLUMN analisis.period_type IS 'Ej: day, week, month.';
COMMENT ON COLUMN analisis.consumption_kwh IS 'Energía total en el período (kWh).';
COMMENT ON COLUMN analisis.avg_power_kw IS 'Potencia promedio en el período (kW).';
COMMENT ON COLUMN analisis.peak_demand_kw IS 'Pico de demanda en el período (kW).';

COMMIT;
