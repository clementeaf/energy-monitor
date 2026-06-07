-- GAP-160–169: Data governance — meter balance, quality rollups, contracts, SLO breaches, audit triggers.

-- Parent/child meter hierarchy for remarcador vs locatarios (DAT-16).
ALTER TABLE meters
    ADD COLUMN IF NOT EXISTS parent_meter_id UUID REFERENCES meters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meters_parent ON meters(parent_meter_id);

-- GAP-160: Daily parent vs children energy balance.
CREATE OR REPLACE VIEW v_meter_balance_daily AS
WITH daily_kwh AS (
    SELECT
        m.tenant_id,
        r.meter_id,
        (r.timestamp AT TIME ZONE 'UTC')::date AS day,
        (MAX(r.energy_kwh_total) - MIN(r.energy_kwh_total))::numeric(14, 4) AS kwh_delta
    FROM readings r
    JOIN meters m ON m.id = r.meter_id
    WHERE r.energy_kwh_total IS NOT NULL
    GROUP BY m.tenant_id, r.meter_id, (r.timestamp AT TIME ZONE 'UTC')::date
    HAVING MAX(r.energy_kwh_total) >= MIN(r.energy_kwh_total)
),
child_sums AS (
    SELECT
        child.parent_meter_id,
        d.day,
        SUM(d.kwh_delta) AS sum_children
    FROM meters child
    JOIN daily_kwh d ON d.meter_id = child.id
    WHERE child.parent_meter_id IS NOT NULL
    GROUP BY child.parent_meter_id, d.day
)
SELECT
    cs.parent_meter_id,
    m.tenant_id,
    cs.day,
    cs.sum_children,
    pd.kwh_delta AS parent_kwh,
    (pd.kwh_delta - cs.sum_children) AS delta
FROM child_sums cs
JOIN daily_kwh pd ON pd.meter_id = cs.parent_meter_id AND pd.day = cs.day
JOIN meters m ON m.id = cs.parent_meter_id;

-- GAP-161: Balance discrepancy records.
CREATE TABLE IF NOT EXISTS balance_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    sum_children NUMERIC(14, 4) NOT NULL,
    parent_kwh NUMERIC(14, 4) NOT NULL,
    delta NUMERIC(14, 4) NOT NULL,
    delta_pct NUMERIC(8, 4),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (parent_meter_id, day)
);

CREATE INDEX IF NOT EXISTS idx_balance_anomalies_tenant_day
    ON balance_anomalies(tenant_id, day DESC);

-- GAP-162: Nightly data quality aggregates.
CREATE TABLE IF NOT EXISTS data_quality_daily (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    measured_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    estimated_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    invalid_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    unknown_pct NUMERIC(6, 2) NOT NULL DEFAULT 0,
    total BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, building_id, day)
);

CREATE INDEX IF NOT EXISTS idx_data_quality_daily_tenant_day
    ON data_quality_daily(tenant_id, day DESC);

-- GAP-165: Versioned export/data contracts per tenant.
CREATE TABLE IF NOT EXISTS data_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name, version)
);

-- GAP-167: SLO breach audit trail.
CREATE TABLE IF NOT EXISTS data_slo_breaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slo_type VARCHAR(50) NOT NULL,
    breached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detail JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_data_slo_breaches_tenant
    ON data_slo_breaches(tenant_id, breached_at DESC);

-- Default global readings export contract (GAP-166 reference).
INSERT INTO data_contracts (tenant_id, name, version, schema_json, effective_from)
SELECT NULL, 'readings-export', '1.0.0',
    '{"exportType":"readings","formats":["csv","parquet"],"columns":["timestamp","meter_id","power_kw","energy_kwh_total","quality","source"]}'::jsonb,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM data_contracts
    WHERE tenant_id IS NULL AND name = 'readings-export' AND version = '1.0.0'
);

INSERT INTO permissions (module, action, description) VALUES
    ('data_quality', 'read', 'Ver reportes de calidad de datos')
ON CONFLICT (module, action) DO NOTHING;

-- GAP-169: Audit config changes on meters and tariffs.
CREATE OR REPLACE FUNCTION fn_audit_config_update()
RETURNS TRIGGER AS $$
DECLARE
    diff JSONB;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        diff := jsonb_build_object(
            'before', to_jsonb(OLD) - 'updated_at',
            'after', to_jsonb(NEW) - 'updated_at'
        );
        INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details)
        VALUES (
            NEW.tenant_id,
            NULL,
            'config.update',
            TG_TABLE_NAME,
            NEW.id::text,
            diff
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meters_config_audit ON meters;
CREATE TRIGGER trg_meters_config_audit
    AFTER UPDATE ON meters
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_config_update();

DROP TRIGGER IF EXISTS trg_tariffs_config_audit ON tariffs;
CREATE TRIGGER trg_tariffs_config_audit
    AFTER UPDATE ON tariffs
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_config_update();

INSERT INTO schema_migrations (version, description) VALUES
    ('38-data-governance', 'meter balance view, quality daily, contracts, SLO breaches, audit triggers')
ON CONFLICT (version) DO NOTHING;
