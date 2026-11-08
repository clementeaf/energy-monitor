DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_index
    WHERE indexrelid = to_regclass('idx_readings_meter_ts_covering') AND indisvalid
  ) THEN
    DROP INDEX IF EXISTS idx_readings_meter_ts;
  ELSE
    RAISE EXCEPTION 'idx_readings_meter_ts_covering is missing or invalid; run migration 64 first';
  END IF;
END $$;
