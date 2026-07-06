-- Migration 15: Intervention records (technical field logs)
CREATE TABLE IF NOT EXISTS interventions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meter_id          UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
  building_id       UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  intervention_type VARCHAR(30) NOT NULL CHECK (intervention_type IN ('inspeccion', 'reemplazo', 'configuracion', 'reparacion', 'instalacion', 'otra')),
  description       TEXT NOT NULL,
  result            VARCHAR(30) NOT NULL CHECK (result IN ('solucionado', 'pendiente_piezas', 'escalacion')),
  requires_cnr      BOOLEAN NOT NULL DEFAULT false,
  integrity_hash    VARCHAR(64),
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interventions_tenant ON interventions(tenant_id);
CREATE INDEX idx_interventions_meter ON interventions(meter_id);
