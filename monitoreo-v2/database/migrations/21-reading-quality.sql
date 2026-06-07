-- GAP-040–043: Reading quality enum, ingest metadata on readings hypertable.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reading_quality') THEN
        CREATE TYPE reading_quality AS ENUM ('measured', 'estimated', 'invalid', 'unknown');
    END IF;
END $$;

ALTER TABLE readings
    ADD COLUMN IF NOT EXISTS quality reading_quality NOT NULL DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS source VARCHAR(30);

COMMENT ON COLUMN readings.quality IS 'Data quality: measured=good, estimated=interpolated, invalid=bad, unknown=legacy/unset';
COMMENT ON COLUMN readings.ingested_at IS 'Wall-clock time when row was inserted into readings (distinct from event timestamp)';
COMMENT ON COLUMN readings.source IS 'Ingest path: modbus, mqtt, api_ingress, backfill, synthetic, etc.';

INSERT INTO schema_migrations (version, description) VALUES
    ('21-reading-quality', 'reading_quality enum + quality, ingested_at, source on readings')
ON CONFLICT (version) DO NOTHING;
