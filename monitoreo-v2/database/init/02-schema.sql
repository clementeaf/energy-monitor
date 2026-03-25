-- ============================================================
-- Monitoreo V2 — Multi-Tenant Schema + TimescaleDB
-- ISO 27001: audit columns, no plaintext secrets, UUID PKs
-- ============================================================

-- Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Theming
    primary_color VARCHAR(7) DEFAULT '#3D3BF3',
    secondary_color VARCHAR(7) DEFAULT '#1E1E2F',
    logo_url TEXT,
    favicon_url TEXT,
    -- Config
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Santiago',
    -- Audit (ISO 27001)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    auth_provider VARCHAR(20) NOT NULL CHECK (auth_provider IN ('microsoft', 'google')),
    auth_provider_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'operator', 'viewer', 'technician')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    -- Audit (ISO 27001)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

-- Refresh tokens (ISO 27001: secure token storage, not sessionStorage)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

-- Audit log (ISO 27001: immutable audit trail)
CREATE TABLE audit_logs (
    id BIGSERIAL,
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert audit_logs to hypertable (immutable, time-partitioned)
SELECT create_hypertable('audit_logs', 'created_at');

-- Buildings (per tenant)
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    area_sqm NUMERIC(12,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

-- Meters (per building, per tenant)
CREATE TABLE meters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    meter_type VARCHAR(50) DEFAULT 'electrical',
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

-- IoT Readings (TimescaleDB hypertable)
CREATE TABLE iot_readings (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL,
    meter_id UUID NOT NULL,
    variable_name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    quality INTEGER DEFAULT 0
);

SELECT create_hypertable('iot_readings', 'time');

CREATE INDEX idx_iot_readings_tenant_meter ON iot_readings(tenant_id, meter_id, time DESC);
CREATE INDEX idx_iot_readings_variable ON iot_readings(tenant_id, variable_name, time DESC);

-- Compression policy: compress chunks older than 7 days
ALTER TABLE iot_readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'tenant_id, meter_id, variable_name',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('iot_readings', INTERVAL '7 days');

-- Retention policy: drop raw data older than 2 years
SELECT add_retention_policy('iot_readings', INTERVAL '2 years');

-- Continuous aggregate: hourly readings
CREATE MATERIALIZED VIEW iot_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    tenant_id,
    meter_id,
    variable_name,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS sample_count
FROM iot_readings
GROUP BY bucket, tenant_id, meter_id, variable_name
WITH NO DATA;

SELECT add_continuous_aggregate_policy('iot_readings_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

-- Continuous aggregate: daily readings
CREATE MATERIALIZED VIEW iot_readings_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    tenant_id,
    meter_id,
    variable_name,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS sample_count
FROM iot_readings
GROUP BY bucket, tenant_id, meter_id, variable_name
WITH NO DATA;

SELECT add_continuous_aggregate_policy('iot_readings_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);
