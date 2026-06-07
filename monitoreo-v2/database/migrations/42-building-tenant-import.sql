-- IMP-070/071: Bulk import staging for buildings and tenant units.
-- Reuses user_import_job_status and user_import_row_status enums from migration 41.

CREATE TABLE IF NOT EXISTS building_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('csv', 'xlsx')),
    status user_import_job_status NOT NULL DEFAULT 'pending_parse',
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    error_rows INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    created_rows INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT,
    committed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_building_import_jobs_tenant_created
    ON building_import_jobs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_building_import_jobs_tenant_status
    ON building_import_jobs (tenant_id, status);

CREATE TABLE IF NOT EXISTS building_import_staging_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES building_import_jobs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL CHECK (row_number > 0),
    raw_cells JSONB NOT NULL DEFAULT '{}',
    name VARCHAR(255),
    code VARCHAR(50),
    address TEXT,
    area_sqm NUMERIC(12, 2),
    region_code VARCHAR(50),
    country_code CHAR(2),
    timezone VARCHAR(50),
    external_site_id VARCHAR(100),
    site_kind VARCHAR(30),
    status user_import_row_status NOT NULL DEFAULT 'pending',
    error_codes TEXT[] NOT NULL DEFAULT '{}',
    resolved_region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    created_building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_building_import_staging_job_status
    ON building_import_staging_rows (job_id, status, row_number);

CREATE TABLE IF NOT EXISTS tenant_unit_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('csv', 'xlsx')),
    status user_import_job_status NOT NULL DEFAULT 'pending_parse',
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    error_rows INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    created_rows INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT,
    committed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_unit_import_jobs_tenant_created
    ON tenant_unit_import_jobs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_unit_import_jobs_tenant_status
    ON tenant_unit_import_jobs (tenant_id, status);

CREATE TABLE IF NOT EXISTS tenant_unit_import_staging_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES tenant_unit_import_jobs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL CHECK (row_number > 0),
    raw_cells JSONB NOT NULL DEFAULT '{}',
    name VARCHAR(255),
    unit_code VARCHAR(50),
    building_code VARCHAR(50),
    external_site_id VARCHAR(100),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    external_unit_id VARCHAR(100),
    status user_import_row_status NOT NULL DEFAULT 'pending',
    error_codes TEXT[] NOT NULL DEFAULT '{}',
    resolved_building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    created_tenant_unit_id UUID REFERENCES tenant_units(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_tenant_unit_import_staging_job_status
    ON tenant_unit_import_staging_rows (job_id, status, row_number);

INSERT INTO schema_migrations (version, description) VALUES
    ('42-building-tenant-import', 'building and tenant unit bulk import jobs/staging')
ON CONFLICT (version) DO NOTHING;
