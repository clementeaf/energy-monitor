-- Migration 10: Privacy policy acceptance + MFA enforcement per role
-- Ley 21.719 compliance + security hardening

-- 1. MFA enforcement per role
ALTER TABLE roles ADD COLUMN IF NOT EXISTS hierarchy_level SMALLINT NOT NULL DEFAULT 99;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS require_mfa BOOLEAN NOT NULL DEFAULT false;

UPDATE roles SET hierarchy_level = CASE slug
    WHEN 'super_admin' THEN 0
    WHEN 'corp_admin' THEN 10
    WHEN 'site_admin' THEN 20
    WHEN 'operator' THEN 30
    WHEN 'analyst' THEN 40
    WHEN 'auditor' THEN 40
    WHEN 'tenant_user' THEN 50
    ELSE hierarchy_level
END
WHERE hierarchy_level = 99;

-- Enforce MFA for privileged roles (hierarchy_level <= 20 = super_admin, corp_admin, site_admin)
UPDATE roles SET require_mfa = true WHERE hierarchy_level <= 20;

-- 2. Privacy policy acceptance tracking (ARCO+ / Ley 21.719)
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(20);

-- 3. Account deletion requests (ARCO+ cancellation right)
CREATE TABLE IF NOT EXISTS deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    notes TEXT
);

CREATE INDEX idx_deletion_requests_status ON deletion_requests(status) WHERE status = 'pending';

-- Index for data export (ARCO+ access/portability) on audit_logs hypertable
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
