BEGIN;

CREATE TABLE IF NOT EXISTS readings_import_staging (
  id                  BIGSERIAL      PRIMARY KEY,
  source_file         TEXT           NOT NULL,
  source_bucket       TEXT           NOT NULL,
  source_key          TEXT           NOT NULL,
  source_row_number   BIGINT         NOT NULL,
  timestamp           TIMESTAMPTZ    NOT NULL,
  meter_id            TEXT           NOT NULL,
  center_name         TEXT           NOT NULL,
  center_type         TEXT           NOT NULL,
  store_type          TEXT           NOT NULL,
  store_name          TEXT           NOT NULL,
  model               TEXT           NOT NULL,
  phase_type          TEXT           NOT NULL,
  uplink_route        TEXT           NOT NULL,
  modbus_address      INTEGER        NOT NULL,
  voltage_l1          NUMERIC(7,2),
  voltage_l2          NUMERIC(7,2),
  voltage_l3          NUMERIC(7,2),
  current_l1          NUMERIC(8,3),
  current_l2          NUMERIC(8,3),
  current_l3          NUMERIC(8,3),
  power_kw            NUMERIC(10,4)  NOT NULL,
  reactive_power_kvar NUMERIC(10,4),
  power_factor        NUMERIC(5,4),
  frequency_hz        NUMERIC(6,3),
  energy_kwh_total    NUMERIC(14,4)  NOT NULL,
  ingested_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_readings_import_staging_row
  ON readings_import_staging (meter_id, timestamp, source_file);

CREATE INDEX IF NOT EXISTS idx_readings_import_staging_source_file
  ON readings_import_staging (source_file);

CREATE INDEX IF NOT EXISTS idx_readings_import_staging_meter_ts
  ON readings_import_staging (meter_id, timestamp);

COMMIT;