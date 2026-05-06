-- Migration 11: Breach reports (Ley 21.719 — 72h notification)
CREATE TABLE IF NOT EXISTS breach_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    reported_by UUID NOT NULL REFERENCES users(id),
    description TEXT NOT NULL,
    data_types_affected TEXT[] NOT NULL,
    estimated_subjects INTEGER,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_at TIMESTAMPTZ NOT NULL,
    notification_deadline TIMESTAMPTZ NOT NULL,
    agency_notified_at TIMESTAMPTZ,
    subjects_notified_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'notified', 'resolved')),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
