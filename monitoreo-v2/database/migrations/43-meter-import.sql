-- IMP-072: Bulk import staging for meters (hierarchy + parent_meter).
-- Reuses user_import_job_status and user_import_row_status enums from migration 41.

CREATE TABLE IF NOT EXISTS meter_import_jobs (
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

CREATE INDEX IF NOT EXISTS idx_meter_import_jobs_tenant_created
    ON meter_import_jobs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meter_import_jobs_tenant_status
    ON meter_import_jobs (tenant_id, status);

CREATE TABLE IF NOT EXISTS meter_import_staging_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES meter_import_jobs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL CHECK (row_number > 0),
    raw_cells JSONB NOT NULL DEFAULT '{}',
    name VARCHAR(255),
    code VARCHAR(100),
    building_code VARCHAR(50),
    external_site_id VARCHAR(100),
    meter_type VARCHAR(50),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    phase_type VARCHAR(20),
    load_category VARCHAR(30),
    parent_meter_code VARCHAR(100),
    hierarchy_node_name VARCHAR(255),
    modbus_address SMALLINT,
    bus_id VARCHAR(100),
    uplink_route VARCHAR(50),
    external_id VARCHAR(100),
    is_active BOOLEAN,
    status user_import_row_status NOT NULL DEFAULT 'pending',
    error_codes TEXT[] NOT NULL DEFAULT '{}',
    resolved_building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    resolved_parent_meter_id UUID REFERENCES meters(id) ON DELETE SET NULL,
    resolved_hierarchy_node_id UUID REFERENCES building_hierarchy(id) ON DELETE SET NULL,
    created_meter_id UUID REFERENCES meters(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_meter_import_staging_job_status
    ON meter_import_staging_rows (job_id, status, row_number);

INSERT INTO schema_migrations (version, description) VALUES
    ('43-meter-import', 'meter bulk import jobs/staging with hierarchy and parent_meter')
ON CONFLICT (version) DO NOTHING;
