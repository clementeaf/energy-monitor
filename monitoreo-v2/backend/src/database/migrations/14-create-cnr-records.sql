-- Migration 14: CNR (Cambios No Registrados) records
CREATE TABLE IF NOT EXISTS cnr_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meter_id      UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
  building_id   UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  value_kwh     DOUBLE PRECISION,
  motivo        VARCHAR(30) NOT NULL CHECK (motivo IN ('comm_failure', 'maintenance', 'replacement', 'other')),
  justification TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  created_by    UUID NOT NULL REFERENCES users(id),
  reviewed_by   UUID REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cnr_records_tenant ON cnr_records(tenant_id);
CREATE INDEX idx_cnr_records_meter ON cnr_records(meter_id);
CREATE INDEX idx_cnr_records_status ON cnr_records(status);
