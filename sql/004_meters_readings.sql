-- ============================================================
-- POWER Digital® — Energy Monitor
-- Migration: Replace locals/monthly_consumption with meters/readings
-- ============================================================

BEGIN;

-- 1. Drop old tables (order matters for FK constraints)
DROP TABLE IF EXISTS monthly_consumption;
DROP TABLE IF EXISTS locals;

-- 2. Update buildings (2 buildings based on gateway/PLC)
DELETE FROM buildings;
INSERT INTO buildings (id, name, address, total_area) VALUES
  ('pac4220', 'PAC4220 Gateway',  'Tablero Principal - Nivel 1', 3000),
  ('s7-1200', 'S7-1200 PLC',     'Tablero Secundario - Nivel 2', 2500)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, total_area = EXCLUDED.total_area;

-- 3. Create meters table
CREATE TABLE IF NOT EXISTS meters (
  id              VARCHAR(10)   PRIMARY KEY,
  building_id     VARCHAR(50)   NOT NULL REFERENCES buildings(id),
  model           VARCHAR(20)   NOT NULL,
  phase_type      VARCHAR(5)    NOT NULL,
  bus_id          VARCHAR(30)   NOT NULL,
  modbus_address  SMALLINT      NOT NULL,
  uplink_route    VARCHAR(100)  NOT NULL,
  status          VARCHAR(10)   NOT NULL DEFAULT 'online',
  last_reading_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meters_building ON meters(building_id);

-- 4. Create readings table
CREATE TABLE IF NOT EXISTS readings (
  id                    SERIAL         PRIMARY KEY,
  meter_id              VARCHAR(10)    NOT NULL REFERENCES meters(id),
  timestamp             TIMESTAMPTZ    NOT NULL,
  voltage_l1            NUMERIC(7,2),
  voltage_l2            NUMERIC(7,2),
  voltage_l3            NUMERIC(7,2),
  current_l1            NUMERIC(8,3),
  current_l2            NUMERIC(8,3),
  current_l3            NUMERIC(8,3),
  power_kw              NUMERIC(10,3)  NOT NULL,
  reactive_power_kvar   NUMERIC(10,3),
  power_factor          NUMERIC(5,3),
  frequency_hz          NUMERIC(6,3),
  energy_kwh_total      NUMERIC(14,3)  NOT NULL,
  thd_voltage_pct       NUMERIC(5,2),
  thd_current_pct       NUMERIC(5,2),
  phase_imbalance_pct   NUMERIC(5,2),
  breaker_status        VARCHAR(10),
  digital_input_1       SMALLINT,
  digital_input_2       SMALLINT,
  digital_output_1      SMALLINT,
  digital_output_2      SMALLINT,
  alarm                 VARCHAR(50),
  modbus_crc_errors     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_readings_meter_ts ON readings(meter_id, timestamp);

-- 5. Seed meters (15 devices)
INSERT INTO meters (id, building_id, model, phase_type, bus_id, modbus_address, uplink_route) VALUES
  ('M001', 'pac4220', 'PAC1670', '3P', 'PAC4220-Bus1', 1,  'PAC4220→POWER_CENTER_3000→MQTT'),
  ('M002', 'pac4220', 'PAC1670', '3P', 'PAC4220-Bus1', 2,  'PAC4220→POWER_CENTER_3000→MQTT'),
  ('M004', 'pac4220', 'PAC1651', '1P', 'PAC4220-Bus1', 4,  'PAC4220→POWER_CENTER_3000→MQTT'),
  ('M005', 'pac4220', 'PAC1651', '1P', 'PAC4220-Bus1', 5,  'PAC4220→POWER_CENTER_3000→MQTT'),
  ('M008', 'pac4220', 'PAC1651', '1P', 'PAC4220-Bus2', 8,  'PAC4220→POWER_CENTER_3000→MQTT'),
  ('M009', 'pac4220', 'PAC1651', '1P', 'PAC4220-Bus2', 9,  'PAC4220→POWER_CENTER_3000→MQTT'),
  ('M012', 'pac4220', 'PAC1670', '3P', 'PAC4220-Bus2', 12, 'PAC4220→POWER_CENTER_3000→MQTT'),
  ('M014', 'pac4220', 'PAC1651', '1P', 'PAC4220-Bus2', 14, 'PAC4220→POWER_CENTER_3000→MQTT'),
  ('M003', 's7-1200', 'PAC1670', '3P', 'S7-1200-Bus1', 3,  'S7-1200→MQTT_Module→Cloud'),
  ('M006', 's7-1200', 'PAC1651', '1P', 'S7-1200-Bus1', 6,  'S7-1200→MQTT_Module→Cloud'),
  ('M007', 's7-1200', 'PAC1651', '1P', 'S7-1200-Bus1', 7,  'S7-1200→MQTT_Module→Cloud'),
  ('M010', 's7-1200', 'PAC1651', '1P', 'S7-1200-Bus1', 10, 'S7-1200→MQTT_Module→Cloud'),
  ('M011', 's7-1200', 'PAC1670', '3P', 'S7-1200-Bus2', 11, 'S7-1200→MQTT_Module→Cloud'),
  ('M013', 's7-1200', 'PAC1670', '3P', 'S7-1200-Bus2', 13, 'S7-1200→MQTT_Module→Cloud'),
  ('M015', 's7-1200', 'PAC1651', '1P', 'S7-1200-Bus2', 15, 'S7-1200→MQTT_Module→Cloud')
ON CONFLICT (id) DO NOTHING;

-- Readings will be loaded via a separate data import script

COMMIT;
