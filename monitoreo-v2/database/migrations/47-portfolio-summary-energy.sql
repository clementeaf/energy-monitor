-- Add sum_energy_kwh to portfolio_summary (avoid JOIN readings_daily on every chart request).

DROP MATERIALIZED VIEW IF EXISTS portfolio_summary;

CREATE MATERIALIZED VIEW portfolio_summary AS
SELECT
    a.bucket::date AS bucket,
    a.tenant_id,
    SUM(a.avg_power_kw * a.reading_count) AS sum_power_kw,
    MAX(a.max_power_kw) AS max_power_kw,
    MIN(a.min_power_kw) AS min_power_kw,
    (SUM(a.avg_power_factor * a.reading_count) / NULLIF(SUM(a.reading_count), 0)) AS avg_power_factor,
    (SUM(a.avg_voltage_l1 * a.reading_count) / NULLIF(SUM(a.reading_count), 0)) AS avg_voltage_l1,
    SUM(a.max_energy_kwh_total - a.min_energy_kwh_total) AS sum_energy_kwh,
    SUM(a.reading_count)::bigint AS reading_count
FROM readings_daily a
GROUP BY a.bucket, a.tenant_id
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_summary_tenant_bucket
    ON portfolio_summary (tenant_id, bucket);

REFRESH MATERIALIZED VIEW portfolio_summary;

INSERT INTO schema_migrations (version, description) VALUES
    ('47-portfolio-summary-energy', 'portfolio_summary.sum_energy_kwh for executive chart perf')
ON CONFLICT (version) DO NOTHING;
