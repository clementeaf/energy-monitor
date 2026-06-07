-- GAP-103: ETL consumer watermarks for incremental export cursors.

CREATE TABLE IF NOT EXISTS etl_watermarks (
    consumer_id VARCHAR(100) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stream VARCHAR(50) NOT NULL DEFAULT 'readings',
    last_cursor TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (consumer_id, tenant_id, stream)
);

CREATE INDEX IF NOT EXISTS idx_etl_watermarks_tenant_stream
    ON etl_watermarks (tenant_id, stream, updated_at DESC);

INSERT INTO schema_migrations (version, description) VALUES
    ('30-etl-watermarks', 'etl_watermarks for incremental export cursors')
ON CONFLICT (version) DO NOTHING;
