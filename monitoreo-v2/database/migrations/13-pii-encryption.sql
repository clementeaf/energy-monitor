-- Migration 13: PII column-level encryption support
-- Ley 21.719 — encryption at rest beyond RDS disk encryption

-- HMAC index column for searchable encrypted email
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hmac VARCHAR(128);

-- Index for email lookups without decrypting
CREATE INDEX IF NOT EXISTS idx_users_email_hmac ON users(email_hmac);

-- Note: actual encryption of existing PII is handled by the application
-- on next read/write cycle. The app encrypts on write and decrypts on read.
-- CONFIG_ENCRYPTION_KEY env var must be set in production for encryption to activate.
