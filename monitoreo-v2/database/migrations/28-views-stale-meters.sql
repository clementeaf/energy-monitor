-- GAP-081: Dashboard view — stale meter counts per tenant.

CREATE OR REPLACE VIEW v_stale_meters_by_tenant AS
SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    COUNT(m.id) FILTER (
        WHERE m.is_active = true
          AND (
            mrs.last_reading_at IS NULL
            OR mrs.last_reading_at < NOW() - INTERVAL '4 hours'
          )
    )::bigint AS stale_meter_count,
    COUNT(m.id) FILTER (WHERE m.is_active = true)::bigint AS active_meter_count
FROM tenants t
LEFT JOIN meters m ON m.tenant_id = t.id
LEFT JOIN meter_reading_status mrs ON mrs.meter_id = m.id
GROUP BY t.id, t.name;

INSERT INTO schema_migrations (version, description) VALUES
    ('28-views-stale-meters', 'v_stale_meters_by_tenant dashboard view')
ON CONFLICT (version) DO NOTHING;
