-- GAP-105: Async data export jobs (CSV / Parquet).

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_format') THEN
        CREATE TYPE export_format AS ENUM ('csv', 'parquet');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_job_status') THEN
        CREATE TYPE export_job_status AS ENUM ('pending', 'running', 'completed', 'failed');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS data_export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    format export_format NOT NULL,
    status export_job_status NOT NULL DEFAULT 'pending',
    params JSONB NOT NULL,
    s3_key VARCHAR(512),
    local_path VARCHAR(512),
    row_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_export_jobs_tenant_status
    ON data_export_jobs (tenant_id, status, created_at DESC);

INSERT INTO schema_migrations (version, description) VALUES
    ('31-export-jobs', 'data_export_jobs async CSV/Parquet export queue')
ON CONFLICT (version) DO NOTHING;
