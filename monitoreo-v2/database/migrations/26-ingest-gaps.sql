-- GAP-074: Detected gaps in meter reading time series.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingest_gap_status') THEN
        CREATE TYPE ingest_gap_status AS ENUM ('open', 'resolved');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS ingest_gaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    gap_start TIMESTAMPTZ NOT NULL,
    gap_end TIMESTAMPTZ NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    status ingest_gap_status NOT NULL DEFAULT 'open'
);

CREATE INDEX IF NOT EXISTS idx_ingest_gaps_tenant_meter
    ON ingest_gaps (tenant_id, meter_id, status);

CREATE INDEX IF NOT EXISTS idx_ingest_gaps_open
    ON ingest_gaps (meter_id) WHERE status = 'open';

INSERT INTO schema_migrations (version, description) VALUES
    ('26-ingest-gaps', 'ingest_gaps table for missing reading buckets')
ON CONFLICT (version) DO NOTHING;
