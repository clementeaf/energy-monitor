-- GAP-030: Enriched site view for reporting and integrations.

CREATE OR REPLACE VIEW v_sites_enriched AS
SELECT
    b.id,
    b.tenant_id,
    b.name,
    b.code,
    b.address,
    b.country_code,
    b.timezone AS building_timezone,
    COALESCE(b.timezone, t.timezone) AS effective_timezone,
    b.external_site_id,
    b.site_kind,
    t.default_country_code AS tenant_country_code,
    t.default_currency AS tenant_currency,
    r.id AS region_id,
    r.code AS region_code,
    r.name AS region_name,
    r.country_code AS region_country_code
FROM buildings b
JOIN tenants t ON t.id = b.tenant_id
LEFT JOIN regions r ON r.id = b.region_id;

INSERT INTO schema_migrations (version, description) VALUES
    ('20-views-enriched', 'v_sites_enriched view (building + tenant + region)')
ON CONFLICT (version) DO NOTHING;
