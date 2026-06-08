-- Pre-aggregate daily readings per building (Compare/Benchmark dashboards).
-- Refreshed daily by DataRetentionService alongside portfolio_summary.

CREATE MATERIALIZED VIEW IF NOT EXISTS building_summary AS
SELECT
    a.bucket::date AS bucket,
    a.tenant_id,
    m.building_id,
    SUM(a.avg_power_kw * a.reading_count) AS sum_power_kw,
    MAX(a.max_power_kw) AS max_power_kw,
    MIN(a.min_power_kw) AS min_power_kw,
    (SUM(a.avg_power_factor * a.reading_count) / NULLIF(SUM(a.reading_count), 0)) AS avg_power_factor,
    (SUM(a.avg_voltage_l1 * a.reading_count) / NULLIF(SUM(a.reading_count), 0)) AS avg_voltage_l1,
    SUM(a.max_energy_kwh_total - a.min_energy_kwh_total) AS sum_energy_kwh,
    SUM(a.reading_count)::bigint AS reading_count
FROM readings_daily a
INNER JOIN meters m ON m.id = a.meter_id
GROUP BY a.bucket, a.tenant_id, m.building_id
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_building_summary_tenant_building_bucket
    ON building_summary (tenant_id, building_id, bucket);

REFRESH MATERIALIZED VIEW building_summary;

INSERT INTO schema_migrations (version, description) VALUES
    ('48-building-summary', 'building_summary matview for compare/benchmark dashboard perf')
ON CONFLICT (version) DO NOTHING;
