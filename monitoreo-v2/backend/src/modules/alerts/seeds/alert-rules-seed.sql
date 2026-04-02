-- Seed: 22 default alert rules (requires a valid tenant_id)
-- Usage: Replace ':tenantId' with actual tenant UUID before running.
-- These are global rules (building_id = NULL) — apply to all buildings.

-- ── Communication ──
INSERT INTO alert_rules (id, tenant_id, alert_type_code, name, severity, config, check_interval_seconds, escalation_l1_minutes, escalation_l2_minutes, escalation_l3_minutes, notify_email)
VALUES
  (gen_random_uuid(), ':tenantId', 'METER_OFFLINE', 'Medidor sin comunicación', 'high', '{"offlineMinutes": 30}', 300, 30, 120, 1440, true),
  (gen_random_uuid(), ':tenantId', 'CONCENTRATOR_OFFLINE', 'Concentrador sin heartbeat', 'critical', '{"offlineMinutes": 15}', 300, 15, 60, 480, true),
  (gen_random_uuid(), ':tenantId', 'COMM_DEGRADED', 'Comunicación degradada', 'medium', '{"minReadingsPctPerHour": 80, "expectedReadingsPerHour": 4}', 900, 60, 240, 1440, true);

-- ── Electrical ──
INSERT INTO alert_rules (id, tenant_id, alert_type_code, name, severity, config, check_interval_seconds, escalation_l1_minutes, escalation_l2_minutes, escalation_l3_minutes, notify_email)
VALUES
  (gen_random_uuid(), ':tenantId', 'VOLTAGE_OUT_OF_RANGE', 'Voltaje fuera de rango', 'high', '{"tolerancePct": 10}', 300, 30, 120, 720, true),
  (gen_random_uuid(), ':tenantId', 'LOW_POWER_FACTOR', 'Factor de potencia bajo', 'medium', '{"minPowerFactor": 0.92}', 300, 60, 240, 1440, true),
  (gen_random_uuid(), ':tenantId', 'HIGH_THD', 'Distorsión armónica alta', 'medium', '{"maxThdVoltagePct": 8, "maxThdCurrentPct": 20}', 300, 60, 240, 1440, true),
  (gen_random_uuid(), ':tenantId', 'PHASE_IMBALANCE', 'Desequilibrio de fases', 'medium', '{"maxImbalancePct": 5}', 300, 60, 240, 1440, true),
  (gen_random_uuid(), ':tenantId', 'FREQUENCY_OUT_OF_RANGE', 'Frecuencia fuera de rango', 'high', '{"minHz": 49.5, "maxHz": 50.5}', 300, 15, 60, 480, true),
  (gen_random_uuid(), ':tenantId', 'OVERCURRENT', 'Sobrecorriente', 'high', '{"tolerancePct": 20}', 300, 15, 60, 480, true),
  (gen_random_uuid(), ':tenantId', 'BREAKER_TRIP', 'Disparo de breaker', 'critical', '{}', 300, 0, 30, 240, true),
  (gen_random_uuid(), ':tenantId', 'NEUTRAL_FAULT', 'Falla de neutro', 'high', '{"maxNeutralDeviationPct": 15}', 300, 15, 60, 480, true);

-- ── Consumption ──
INSERT INTO alert_rules (id, tenant_id, alert_type_code, name, severity, config, check_interval_seconds, escalation_l1_minutes, escalation_l2_minutes, escalation_l3_minutes, notify_email)
VALUES
  (gen_random_uuid(), ':tenantId', 'ABNORMAL_CONSUMPTION', 'Consumo anormal', 'medium', '{"deviationPct": 50}', 900, 120, 480, 1440, true),
  (gen_random_uuid(), ':tenantId', 'PEAK_DEMAND_EXCEEDED', 'Demanda peak excedida', 'high', '{"tolerancePct": 0}', 300, 15, 60, 480, true),
  (gen_random_uuid(), ':tenantId', 'ENERGY_DEVIATION', 'Desviación de energía diaria', 'low', '{"deviationPct": 30}', 3600, 240, 720, 1440, true);

-- ── Operational ──
INSERT INTO alert_rules (id, tenant_id, alert_type_code, name, severity, config, check_interval_seconds, escalation_l1_minutes, escalation_l2_minutes, escalation_l3_minutes, notify_email)
VALUES
  (gen_random_uuid(), ':tenantId', 'METER_TAMPER', 'Posible manipulación de medidor', 'critical', '{}', 300, 0, 30, 240, true),
  (gen_random_uuid(), ':tenantId', 'CONFIG_CHANGE', 'Cambio de configuración', 'low', '{}', 0, 0, 0, 0, false),
  (gen_random_uuid(), ':tenantId', 'FIRMWARE_MISMATCH', 'Firmware no coincide', 'medium', '{"expectedVersion": ""}', 3600, 1440, 4320, 10080, true);

-- ── Generation ──
INSERT INTO alert_rules (id, tenant_id, alert_type_code, name, severity, config, check_interval_seconds, escalation_l1_minutes, escalation_l2_minutes, escalation_l3_minutes, notify_email)
VALUES
  (gen_random_uuid(), ':tenantId', 'GENERATION_LOW', 'Generación baja', 'medium', '{"minGenerationKw": 0}', 900, 60, 240, 1440, true),
  (gen_random_uuid(), ':tenantId', 'INVERTER_FAULT', 'Falla de inversor', 'critical', '{}', 300, 0, 30, 240, true),
  (gen_random_uuid(), ':tenantId', 'GRID_EXPORT_LIMIT', 'Límite exportación red', 'high', '{"maxExportKw": 0}', 300, 15, 60, 480, true);

-- ── Bus / Concentrador ──
INSERT INTO alert_rules (id, tenant_id, alert_type_code, name, severity, config, check_interval_seconds, escalation_l1_minutes, escalation_l2_minutes, escalation_l3_minutes, notify_email)
VALUES
  (gen_random_uuid(), ':tenantId', 'BUS_ERROR', 'Error de bus', 'high', '{"minOfflineOnBus": 3}', 300, 30, 120, 720, true),
  (gen_random_uuid(), ':tenantId', 'MODBUS_TIMEOUT', 'Timeout Modbus', 'medium', '{"maxErrors": 10}', 300, 60, 240, 1440, true),
  (gen_random_uuid(), ':tenantId', 'CRC_ERROR', 'Errores CRC excesivos', 'medium', '{"maxCrcErrors": 5}', 300, 60, 240, 1440, true);
