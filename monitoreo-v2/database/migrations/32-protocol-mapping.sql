-- GAP-110–111: Protocol types catalog + register_mappings (multi-tenant, global templates).

CREATE TABLE IF NOT EXISTS protocol_types (
    code VARCHAR(30) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT
);

INSERT INTO protocol_types (code, label, description) VALUES
    ('modbus', 'Modbus RTU/TCP', 'PAC concentrators and field devices'),
    ('mqtt', 'MQTT / IoT Core', 'Siemens POC3000 and MQTT brokers'),
    ('bacnet', 'BACnet/IP', 'Building automation devices'),
    ('snmp', 'SNMP', 'Network-attached power meters'),
    ('api', 'REST API ingress', 'Third-party virtual meters via API')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS register_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    protocol VARCHAR(30) NOT NULL REFERENCES protocol_types(code),
    device_profile VARCHAR(100) NOT NULL,
    register_key VARCHAR(100) NOT NULL,
    target_field VARCHAR(100) NOT NULL,
    scale_factor NUMERIC(14, 6) NOT NULL DEFAULT 1,
    unit VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_register_mappings_global_unique
    ON register_mappings (protocol, device_profile, register_key)
    WHERE tenant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_register_mappings_tenant_unique
    ON register_mappings (tenant_id, protocol, device_profile, register_key)
    WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_register_mappings_tenant_protocol
    ON register_mappings (tenant_id, protocol, device_profile);

INSERT INTO permissions (module, action, description) VALUES
    ('register_mappings', 'read', 'Ver mapeos de registros por protocolo'),
    ('register_mappings', 'create', 'Crear mapeos de registros'),
    ('register_mappings', 'update', 'Modificar mapeos de registros'),
    ('register_mappings', 'delete', 'Eliminar mapeos de registros')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO schema_migrations (version, description) VALUES
    ('32-protocol-mapping', 'protocol_types + register_mappings + RBAC permissions')
ON CONFLICT (version) DO NOTHING;
