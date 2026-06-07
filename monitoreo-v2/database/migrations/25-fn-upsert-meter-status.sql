-- GAP-072: Upsert meter_reading_status on each readings INSERT.

CREATE OR REPLACE FUNCTION upsert_meter_reading_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO meter_reading_status (
        meter_id,
        tenant_id,
        last_reading_at,
        last_ingested_at,
        last_source,
        updated_at
    ) VALUES (
        NEW.meter_id,
        NEW.tenant_id,
        NEW.timestamp,
        COALESCE(NEW.ingested_at, NOW()),
        NEW.source,
        NOW()
    )
    ON CONFLICT (meter_id) DO UPDATE SET
        last_reading_at = CASE
            WHEN EXCLUDED.last_reading_at >= meter_reading_status.last_reading_at
              OR meter_reading_status.last_reading_at IS NULL
            THEN EXCLUDED.last_reading_at
            ELSE meter_reading_status.last_reading_at
        END,
        last_ingested_at = EXCLUDED.last_ingested_at,
        last_source = COALESCE(EXCLUDED.last_source, meter_reading_status.last_source),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_readings_upsert_meter_status ON readings;

CREATE TRIGGER trg_readings_upsert_meter_status
    AFTER INSERT ON readings
    FOR EACH ROW
    EXECUTE FUNCTION upsert_meter_reading_status();

INSERT INTO schema_migrations (version, description) VALUES
    ('25-fn-upsert-meter-status', 'trigger upsert meter_reading_status on readings insert')
ON CONFLICT (version) DO NOTHING;
