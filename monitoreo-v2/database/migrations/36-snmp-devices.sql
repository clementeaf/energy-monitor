-- GAP-141: SNMP device inventory (schema only; community stays in integration config).

CREATE TABLE IF NOT EXISTS snmp_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    ip INET NOT NULL,
    port INTEGER NOT NULL DEFAULT 161 CHECK (port >= 1 AND port <= 65535),
    snmp_version SMALLINT NOT NULL DEFAULT 2 CHECK (snmp_version IN (1, 2)),
    meter_id UUID REFERENCES meters(id) ON DELETE SET NULL,
    device_profile VARCHAR(100) NOT NULL DEFAULT 'snmp-generic',
    label VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snmp_devices_tenant ON snmp_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_snmp_devices_building ON snmp_devices(building_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_snmp_devices_tenant_ip_port
    ON snmp_devices(tenant_id, ip, port);

INSERT INTO schema_migrations (version, description) VALUES
    ('36-snmp-devices', 'snmp_devices inventory table')
ON CONFLICT (version) DO NOTHING;
