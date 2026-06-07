-- GAP-180–186: Per-tenant enterprise SSO (OIDC / Azure AD) + SCIM deprovision stub.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_provider_check;
ALTER TABLE users ADD CONSTRAINT users_auth_provider_check
    CHECK (auth_provider IN ('microsoft', 'google', 'oidc'));

CREATE TABLE IF NOT EXISTS tenant_sso_config (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    issuer TEXT NOT NULL,
    client_id TEXT NOT NULL,
    metadata_url TEXT,
    encrypted_client_secret TEXT NOT NULL,
    scim_webhook_secret TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO permissions (module, action, description) VALUES
    ('sso', 'read', 'Ver configuración SSO del tenant'),
    ('sso', 'update', 'Actualizar configuración SSO del tenant')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO schema_migrations (version, description) VALUES
    ('39-tenant-sso-config', 'tenant_sso_config + auth_provider oidc + sso permissions')
ON CONFLICT (version) DO NOTHING;
