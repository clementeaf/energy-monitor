-- GAP-010–018: Multi-tenant geography (tenants, regions, buildings).
-- PASA is one tenant; schema is generic for any country/region/site.

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS default_country_code CHAR(2),
    ADD COLUMN IF NOT EXISTS default_currency CHAR(3);

CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    country_code CHAR(2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_regions_tenant ON regions (tenant_id);

ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS country_code CHAR(2),
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS external_site_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS site_kind VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_buildings_region ON buildings (region_id);
CREATE INDEX IF NOT EXISTS idx_buildings_tenant_country ON buildings (tenant_id, country_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_buildings_tenant_external_site
    ON buildings (tenant_id, external_site_id)
    WHERE external_site_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_buildings_site_kind'
    ) THEN
        ALTER TABLE buildings ADD CONSTRAINT chk_buildings_site_kind
            CHECK (site_kind IS NULL OR site_kind IN ('mall', 'outlet', 'strip', 'office', 'other'));
    END IF;
END $$;

-- GAP-024: Demo region for Globe Power seed tenant (idempotent, not PASA-specific).
INSERT INTO regions (id, tenant_id, code, name, country_code)
VALUES (
    'f0000001-0000-0000-0000-000000000001',
    '84adf8d4-830d-46e1-bef5-e2eac6a19014',
    'cl-central',
    'Chile Central',
    'CL'
)
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO schema_migrations (version, description) VALUES
    ('17-tenant-geography', 'Tenant geography defaults, regions table, building site metadata')
ON CONFLICT (version) DO NOTHING;
