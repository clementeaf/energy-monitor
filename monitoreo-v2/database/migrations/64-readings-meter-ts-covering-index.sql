CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_readings_meter_ts_covering
  ON readings (meter_id, "timestamp")
  INCLUDE (energy_kwh_total, power_kw, power_factor, voltage_l1);
