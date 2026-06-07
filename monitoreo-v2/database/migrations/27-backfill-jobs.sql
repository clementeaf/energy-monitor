-- GAP-077: Admin backfill job queue.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'backfill_job_status') THEN
        CREATE TYPE backfill_job_status AS ENUM ('pending', 'running', 'completed', 'failed');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS backfill_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    from_ts TIMESTAMPTZ NOT NULL,
    to_ts TIMESTAMPTZ NOT NULL,
    status backfill_job_status NOT NULL DEFAULT 'pending',
    rows_inserted INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backfill_jobs_tenant_status
    ON backfill_jobs (tenant_id, status, created_at DESC);

INSERT INTO schema_migrations (version, description) VALUES
    ('27-backfill-jobs', 'backfill_jobs queue for historical re-ingest')
ON CONFLICT (version) DO NOTHING;
