-- ============================================================
-- TimescaleDB Optimization: compression, retention, continuous aggregates
-- Applied to: readings, audit_logs, integration_sync_logs
-- ============================================================

-- ============================================================
-- 1. READINGS — Compression
-- ============================================================

ALTER TABLE readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'tenant_id, meter_id',
    timescaledb.compress_orderby = 'timestamp DESC'
);

-- Compress chunks older than 7 days
SELECT add_compression_policy('readings', INTERVAL '7 days');

-- ============================================================
-- 2. READINGS — Retention (drop raw data older than 3 years)
-- ============================================================

SELECT add_retention_policy('readings', INTERVAL '3 years');

-- ============================================================
-- 3. READINGS — Continuous Aggregates (hourly + daily)
-- ============================================================

-- Hourly pre-computed aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS bucket,
    tenant_id,
    meter_id,
    AVG(power_kw::double precision)          AS avg_power_kw,
    MAX(power_kw::double precision)          AS max_power_kw,
    MIN(power_kw::double precision)          AS min_power_kw,
    AVG(power_factor::double precision)      AS avg_power_factor,
    AVG(voltage_l1::double precision)        AS avg_voltage_l1,
    MAX(energy_kwh_total::double precision)  AS max_energy_kwh_total,
    MIN(energy_kwh_total::double precision)  AS min_energy_kwh_total,
    COUNT(*)                                 AS reading_count
FROM readings
GROUP BY bucket, tenant_id, meter_id
WITH NO DATA;

-- Refresh policy: materialize hourly data with 2-hour lag
SELECT add_continuous_aggregate_policy('readings_hourly',
    start_offset  => INTERVAL '3 days',
    end_offset    => INTERVAL '2 hours',
    schedule_interval => INTERVAL '1 hour'
);

-- Daily pre-computed aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS readings_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', timestamp) AS bucket,
    tenant_id,
    meter_id,
    AVG(power_kw::double precision)          AS avg_power_kw,
    MAX(power_kw::double precision)          AS max_power_kw,
    MIN(power_kw::double precision)          AS min_power_kw,
    AVG(power_factor::double precision)      AS avg_power_factor,
    AVG(voltage_l1::double precision)        AS avg_voltage_l1,
    MAX(energy_kwh_total::double precision)  AS max_energy_kwh_total,
    MIN(energy_kwh_total::double precision)  AS min_energy_kwh_total,
    COUNT(*)                                 AS reading_count
FROM readings
GROUP BY bucket, tenant_id, meter_id
WITH NO DATA;

-- Refresh policy: materialize daily data with 1-day lag
SELECT add_continuous_aggregate_policy('readings_daily',
    start_offset  => INTERVAL '7 days',
    end_offset    => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);

-- ============================================================
-- 4. AUDIT_LOGS — Compression + Retention
-- ============================================================

ALTER TABLE audit_logs SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'tenant_id',
    timescaledb.compress_orderby = 'created_at DESC'
);

-- Compress chunks older than 30 days
SELECT add_compression_policy('audit_logs', INTERVAL '30 days');

-- Keep 5 years (ISO 27001 compliance)
SELECT add_retention_policy('audit_logs', INTERVAL '5 years');

-- ============================================================
-- 5. INTEGRATION_SYNC_LOGS — Compression + Retention
-- ============================================================

ALTER TABLE integration_sync_logs SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'integration_id',
    timescaledb.compress_orderby = 'created_at DESC'
);

-- Compress chunks older than 7 days
SELECT add_compression_policy('integration_sync_logs', INTERVAL '7 days');

-- Keep 1 year
SELECT add_retention_policy('integration_sync_logs', INTERVAL '1 year');
