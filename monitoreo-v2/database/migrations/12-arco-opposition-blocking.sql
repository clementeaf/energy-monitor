-- Migration 12: ARCO+ opposition/blocking rights + deadlines
-- Ley 21.719 compliance

-- 1. Opposition & blocking flag on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_processing_blocked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- 2. Response deadline on deletion requests (15 business days)
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ;

-- Backfill existing pending requests with 15 business days from requested_at
UPDATE deletion_requests
SET response_deadline = requested_at + INTERVAL '21 days'
WHERE response_deadline IS NULL;

-- 3. Rectification requests table (for email changes and other fields admins must verify)
CREATE TABLE IF NOT EXISTS rectification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    current_value TEXT,
    requested_value TEXT NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    response_deadline TIMESTAMPTZ NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id)
);
