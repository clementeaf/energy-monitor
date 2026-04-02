-- PASA — Lecturas eléctricas (Timescale hypertable). Alineado a platform/entities/reading.entity.ts
-- Debe ejecutarse tras meters (02-schema / 05-modules).

CREATE TABLE IF NOT EXISTS readings (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    voltage_l1 NUMERIC(7, 2),
    voltage_l2 NUMERIC(7, 2),
    voltage_l3 NUMERIC(7, 2),
    current_l1 NUMERIC(8, 3),
    current_l2 NUMERIC(8, 3),
    current_l3 NUMERIC(8, 3),
    power_kw NUMERIC(10, 3) NOT NULL,
    reactive_power_kvar NUMERIC(10, 3),
    power_factor NUMERIC(5, 3),
    frequency_hz NUMERIC(6, 3),
    energy_kwh_total NUMERIC(14, 3) NOT NULL,
    thd_voltage_pct NUMERIC(5, 2),
    thd_current_pct NUMERIC(5, 2),
    phase_imbalance_pct NUMERIC(5, 2),
    breaker_status VARCHAR(10),
    digital_input_1 SMALLINT,
    digital_input_2 SMALLINT,
    digital_output_1 SMALLINT,
    digital_output_2 SMALLINT,
    alarm VARCHAR(50),
    modbus_crc_errors INTEGER,
    PRIMARY KEY (id, timestamp)
);

SELECT create_hypertable(
    'readings',
    'timestamp',
    if_not_exists => TRUE
);

CREATE INDEX IF NOT EXISTS idx_readings_meter_ts ON readings (meter_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_tenant_ts ON readings (tenant_id, timestamp DESC);
