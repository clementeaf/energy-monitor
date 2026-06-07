-- GAP-025: External unit identifier per building (ERP / billing integration).

ALTER TABLE tenant_units
    ADD COLUMN IF NOT EXISTS external_unit_id VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_units_building_external
    ON tenant_units (building_id, external_unit_id)
    WHERE external_unit_id IS NOT NULL;

INSERT INTO schema_migrations (version, description) VALUES
    ('18-tenant-units-external', 'tenant_units.external_unit_id with unique per building')
ON CONFLICT (version) DO NOTHING;
