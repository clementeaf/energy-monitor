-- Auto-discovered IoT devices. Lambda upserts on unknown device_client_id.
CREATE TABLE IF NOT EXISTS iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_client_id VARCHAR(255) NOT NULL UNIQUE,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_meter_id UUID REFERENCES meters(id) ON DELETE SET NULL,
  payload_sample JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iot_devices_assigned ON iot_devices (assigned_meter_id);
