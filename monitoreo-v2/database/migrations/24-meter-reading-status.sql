-- GAP-070–071: Per-meter ingest/read lag tracking.

CREATE TABLE IF NOT EXISTS meter_reading_status (
    meter_id UUID PRIMARY KEY REFERENCES meters(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    last_reading_at TIMESTAMPTZ,
    last_ingested_at TIMESTAMPTZ,
    last_source VARCHAR(30),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meter_reading_status_tenant_last
    ON meter_reading_status (tenant_id, last_reading_at DESC);

INSERT INTO schema_migrations (version, description) VALUES
    ('24-meter-reading-status', 'meter_reading_status table for ingest traceability')
ON CONFLICT (version) DO NOTHING;
