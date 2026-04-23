-- MFA columns for users table
-- mfa_secret and mfa_enabled were added in v1.1.0-alpha.0 (TypeORM sync)
-- This migration adds them explicitly + the new mfa_recovery_codes column

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_recovery_codes TEXT DEFAULT NULL;
