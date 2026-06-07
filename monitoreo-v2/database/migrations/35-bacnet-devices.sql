-- GAP-131: BACnet device inventory (schema only).

CREATE TABLE IF NOT EXISTS bacnet_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    device_id INTEGER NOT NULL CHECK (device_id >= 0 AND device_id <= 4194303),
    ip INET NOT NULL,
    port INTEGER NOT NULL DEFAULT 47808 CHECK (port >= 1 AND port <= 65535),
    meter_id UUID REFERENCES meters(id) ON DELETE SET NULL,
    device_profile VARCHAR(100) NOT NULL DEFAULT 'bacnet-generic',
    label VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bacnet_devices_tenant ON bacnet_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bacnet_devices_building ON bacnet_devices(building_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bacnet_devices_tenant_device_ip
    ON bacnet_devices(tenant_id, device_id, ip);

INSERT INTO schema_migrations (version, description) VALUES
    ('35-bacnet-devices', 'bacnet_devices inventory table')
ON CONFLICT (version) DO NOTHING;
