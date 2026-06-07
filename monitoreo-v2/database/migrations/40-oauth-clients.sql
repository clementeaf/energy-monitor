-- GAP-190–191: OAuth2 client_credentials clients for ETL integrations.

CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    client_id VARCHAR(64) NOT NULL UNIQUE,
    secret_hash VARCHAR(64) NOT NULL,
    client_id_prefix VARCHAR(12) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    building_ids UUID[] NOT NULL DEFAULT '{}',
    token_ttl_seconds INTEGER NOT NULL DEFAULT 3600 CHECK (token_ttl_seconds BETWEEN 300 AND 86400),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_clients_tenant ON oauth_clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_prefix ON oauth_clients(client_id_prefix) WHERE is_active = true;

INSERT INTO permissions (module, action, description) VALUES
    ('oauth_clients', 'read', 'Ver clientes OAuth2'),
    ('oauth_clients', 'create', 'Crear clientes OAuth2'),
    ('oauth_clients', 'update', 'Modificar/revocar clientes OAuth2')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO schema_migrations (version, description) VALUES
    ('40-oauth-clients', 'oauth_clients table + oauth_clients permissions')
ON CONFLICT (version) DO NOTHING;
