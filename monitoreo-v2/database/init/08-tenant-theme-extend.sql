-- Extend tenants table with richer theme + onboarding config
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS app_title       VARCHAR(100) DEFAULT 'Energy Monitor',
  ADD COLUMN IF NOT EXISTS sidebar_color   VARCHAR(7)   DEFAULT '#1E1E2F',
  ADD COLUMN IF NOT EXISTS accent_color    VARCHAR(7)   DEFAULT '#10B981',
  ADD COLUMN IF NOT EXISTS settings        JSONB        NOT NULL DEFAULT '{}';

COMMENT ON COLUMN tenants.app_title     IS 'Browser tab title and header text';
COMMENT ON COLUMN tenants.sidebar_color IS 'Sidebar background color (hex)';
COMMENT ON COLUMN tenants.accent_color  IS 'Success/accent color (hex)';
COMMENT ON COLUMN tenants.settings      IS 'Flexible tenant-level config (locale, date format, etc.)';
