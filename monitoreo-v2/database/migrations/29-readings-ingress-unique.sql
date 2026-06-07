-- GAP-091, GAP-095: Dedupe api_ingress readings per meter/timestamp/source; optional higher ingress rate per API key.

CREATE UNIQUE INDEX IF NOT EXISTS idx_readings_meter_ts_source_unique
    ON readings (meter_id, timestamp, source)
    WHERE source IS NOT NULL;

ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS ingress_rate_limit_per_minute INT NULL;

COMMENT ON COLUMN api_keys.ingress_rate_limit_per_minute IS
    'Optional higher rate limit (req/min) for POST /v1/measurements; NULL uses default ingress multiplier';

INSERT INTO schema_migrations (version, description)
VALUES
    ('29-readings-ingress-unique', 'unique (meter_id,timestamp,source) + api_keys.ingress_rate_limit_per_minute')
ON CONFLICT (version) DO NOTHING;
