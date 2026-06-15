-- 49-session-idle-timeout: Add last_activity_at to refresh_tokens for idle timeout tracking
-- Idempotent: uses IF NOT EXISTS / safe ADD COLUMN pattern

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE refresh_tokens
      ADD COLUMN last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Index for efficient idle session queries (active tokens by user ordered by activity)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active_activity
  ON refresh_tokens (user_id, last_activity_at DESC)
  WHERE revoked_at IS NULL;

-- Track migration
INSERT INTO schema_migrations (version, description)
VALUES ('49-session-idle-timeout', 'Add last_activity_at to refresh_tokens for idle timeout')
ON CONFLICT (version) DO NOTHING;
