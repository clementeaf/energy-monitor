-- ============================================================
-- POWER Digital® — Energy Monitor
-- Schema: alerts for offline meter notifications
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            VARCHAR(50)   NOT NULL,
  severity        VARCHAR(20)   NOT NULL DEFAULT 'high',
  status          VARCHAR(20)   NOT NULL DEFAULT 'active',
  meter_id        VARCHAR(10)   REFERENCES meters(id) ON DELETE CASCADE,
  building_id     VARCHAR(50)   REFERENCES buildings(id) ON DELETE CASCADE,
  title           VARCHAR(200)  NOT NULL,
  message         TEXT          NOT NULL,
  triggered_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  metadata        JSONB         NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_alert_status CHECK (status IN ('active', 'acknowledged', 'resolved'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_status_triggered ON alerts(status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_meter_type ON alerts(meter_id, type);
CREATE UNIQUE INDEX IF NOT EXISTS ux_alerts_meter_offline_open
  ON alerts(meter_id, type)
  WHERE status IN ('active', 'acknowledged');

COMMIT;
