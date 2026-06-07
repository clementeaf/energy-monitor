-- GAP-062–064, GAP-068: Align readings + iot_readings retention to 5 years (PASA DAT-08).
-- Compression policy unchanged: chunks compress after 7 days (compatible with 5y retention).
-- Application cron must NOT DELETE from readings — TimescaleDB policy only (GAP-069).

SELECT remove_retention_policy('readings', if_exists => true);
SELECT add_retention_policy('readings', INTERVAL '5 years');

SELECT remove_retention_policy('iot_readings', if_exists => true);
SELECT add_retention_policy('iot_readings', INTERVAL '5 years');

INSERT INTO schema_migrations (version, description) VALUES
    ('22-retention-5y', 'readings and iot_readings retention 3y/2y → 5y')
ON CONFLICT (version) DO NOTHING;
