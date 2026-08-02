CREATE TABLE IF NOT EXISTS user_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] DEFAULT '{}',
  device_name VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_credentials_user ON user_credentials(user_id);

INSERT INTO schema_migrations (version)
VALUES ('62-webauthn-credentials')
ON CONFLICT (version) DO NOTHING;
