-- IMP-001–006: User bulk import staging + invited-user OAuth placeholder.
-- Idempotent. Safe to re-run on local Docker and RDS prod.

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invited / import users: auth_provider_id filled on first OAuth login.
ALTER TABLE users
    ALTER COLUMN auth_provider_id DROP NOT NULL;

UPDATE users
SET auth_provider_id = 'pending-import'
WHERE auth_provider_id IS NULL
   OR TRIM(auth_provider_id) = '';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_import_job_status') THEN
        CREATE TYPE user_import_job_status AS ENUM (
            'pending_parse',
            'ready',
            'committing',
            'committed',
            'failed',
            'cancelled'
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_import_row_status') THEN
        CREATE TYPE user_import_row_status AS ENUM (
            'pending',
            'valid',
            'error',
            'duplicate',
            'skipped',
            'created'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_import_jobs (
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
    age_verified_at_commit BOOLEAN NOT NULL DEFAULT false,
    error_summary TEXT,
    committed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_import_jobs_tenant_created
    ON user_import_jobs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_import_jobs_tenant_status
    ON user_import_jobs (tenant_id, status);

CREATE TABLE IF NOT EXISTS user_import_staging_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES user_import_jobs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL CHECK (row_number > 0),
    raw_cells JSONB NOT NULL DEFAULT '{}',
    email VARCHAR(255),
    display_name VARCHAR(255),
    auth_provider VARCHAR(20),
    role_slug VARCHAR(50),
    building_codes_raw TEXT,
    phone VARCHAR(20),
    status user_import_row_status NOT NULL DEFAULT 'pending',
    error_codes TEXT[] NOT NULL DEFAULT '{}',
    resolved_role_id UUID,
    resolved_building_ids UUID[] NOT NULL DEFAULT '{}',
    created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_user_import_staging_job_status
    ON user_import_staging_rows (job_id, status, row_number);

CREATE INDEX IF NOT EXISTS idx_user_import_staging_tenant
    ON user_import_staging_rows (tenant_id, job_id);

INSERT INTO schema_migrations (version, description) VALUES
    ('41-user-import-prereq', 'user import jobs/staging + nullable auth_provider_id for invites')
ON CONFLICT (version) DO NOTHING;
