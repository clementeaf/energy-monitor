-- API Keys for external API access (third-party consumers)
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  key_hash      VARCHAR(64) NOT NULL UNIQUE,    -- SHA-256 hex
  key_prefix    VARCHAR(12) NOT NULL,            -- first 8 chars of key for identification
  permissions   TEXT[] NOT NULL DEFAULT '{}',     -- e.g. {'buildings:read','meters:read'}
  building_ids  UUID[] NOT NULL DEFAULT '{}',    -- empty = all buildings
  rate_limit_per_minute INT NOT NULL DEFAULT 60,
  expires_at    TIMESTAMPTZ,                     -- null = never expires
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_tenant ON api_keys (tenant_id);
CREATE INDEX idx_api_keys_hash   ON api_keys (key_hash) WHERE is_active = TRUE;
