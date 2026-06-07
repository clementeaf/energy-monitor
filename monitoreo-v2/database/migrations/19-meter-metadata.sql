-- GAP-027–028: Meter load category + documented metadata JSONB.

ALTER TABLE meters
    ADD COLUMN IF NOT EXISTS load_category VARCHAR(30);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_meters_load_category'
    ) THEN
        ALTER TABLE meters ADD CONSTRAINT chk_meters_load_category
            CHECK (load_category IS NULL OR load_category IN ('hvac', 'lighting', 'tenant', 'main', 'other'));
    END IF;
END $$;

COMMENT ON COLUMN meters.metadata IS
    'Tenant-defined JSON metadata (protocol labels, custom tags, integration refs). '
    'Optional GIN index: CREATE INDEX idx_meters_metadata_gin ON meters USING GIN (metadata);';

INSERT INTO schema_migrations (version, description) VALUES
    ('19-meter-metadata', 'meters.load_category enum + metadata column documentation')
ON CONFLICT (version) DO NOTHING;
