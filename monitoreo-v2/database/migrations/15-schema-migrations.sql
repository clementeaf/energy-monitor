-- GAP-006: Track applied schema versions for health checks and ops.
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Baseline registry (idempotent). New migrations append rows when applied manually.
INSERT INTO schema_migrations (version, description) VALUES
    ('init-01-extensions', 'uuid-ossp + TimescaleDB extensions'),
    ('init-02-schema', 'Core tenants, users, buildings, meters, iot_readings'),
    ('init-06-readings', 'readings hypertable'),
    ('init-09-timescaledb-optimize', 'Compression, retention policies, readings_hourly/daily CAGG'),
    ('10-privacy-mfa-enforcement', 'MFA per role, privacy acceptance columns'),
    ('11-breach-reports', 'Breach notification tracking'),
    ('12-arco-opposition-blocking', 'ARCO opposition and processing block'),
    ('13-pii-encryption', 'PII encryption columns'),
    ('14-automated-decisions-age', 'Automated decisions age verification')
ON CONFLICT (version) DO NOTHING;

INSERT INTO schema_migrations (version, description) VALUES
    ('15-schema-migrations', 'schema_migrations registry table')
ON CONFLICT (version) DO NOTHING;
