-- Populate portfolio_summary after migration 16 created it WITH NO DATA.
-- Safe to re-run: REFRESH is idempotent.

REFRESH MATERIALIZED VIEW portfolio_summary;

INSERT INTO schema_migrations (version, description) VALUES
    ('46-portfolio-summary-refresh', 'Initial REFRESH of portfolio_summary matview')
ON CONFLICT (version) DO NOTHING;
