/**
 * 22 alert type codes grouped by family.
 * Each code matches alert_rules.alert_type_code and alerts.alert_type_code.
 */

// ── Communication ─────────────────────────────────────
export const METER_OFFLINE = 'METER_OFFLINE';
export const CONCENTRATOR_OFFLINE = 'CONCENTRATOR_OFFLINE';
export const COMM_DEGRADED = 'COMM_DEGRADED';

// ── Electrical ────────────────────────────────────────
export const VOLTAGE_OUT_OF_RANGE = 'VOLTAGE_OUT_OF_RANGE';
export const LOW_POWER_FACTOR = 'LOW_POWER_FACTOR';
export const HIGH_THD = 'HIGH_THD';
export const PHASE_IMBALANCE = 'PHASE_IMBALANCE';

// ── Consumption ───────────────────────────────────────
export const ABNORMAL_CONSUMPTION = 'ABNORMAL_CONSUMPTION';
export const PEAK_DEMAND_EXCEEDED = 'PEAK_DEMAND_EXCEEDED';
export const ENERGY_DEVIATION = 'ENERGY_DEVIATION';

// ── Operational ───────────────────────────────────────
export const METER_TAMPER = 'METER_TAMPER';
export const CONFIG_CHANGE = 'CONFIG_CHANGE';
export const FIRMWARE_MISMATCH = 'FIRMWARE_MISMATCH';

// ── Generation ────────────────────────────────────────
export const GENERATION_LOW = 'GENERATION_LOW';
export const INVERTER_FAULT = 'INVERTER_FAULT';
export const GRID_EXPORT_LIMIT = 'GRID_EXPORT_LIMIT';

// ── Bus / Concentrator ────────────────────────────────
export const BUS_ERROR = 'BUS_ERROR';
export const MODBUS_TIMEOUT = 'MODBUS_TIMEOUT';
export const CRC_ERROR = 'CRC_ERROR';

// ── Extra (XLSX) ──────────────────────────────────────
export const FREQUENCY_OUT_OF_RANGE = 'FREQUENCY_OUT_OF_RANGE';
export const OVERCURRENT = 'OVERCURRENT';
export const BREAKER_TRIP = 'BREAKER_TRIP';
export const NEUTRAL_FAULT = 'NEUTRAL_FAULT';

export type AlertTypeCode =
  | typeof METER_OFFLINE
  | typeof CONCENTRATOR_OFFLINE
  | typeof COMM_DEGRADED
  | typeof VOLTAGE_OUT_OF_RANGE
  | typeof LOW_POWER_FACTOR
  | typeof HIGH_THD
  | typeof PHASE_IMBALANCE
  | typeof ABNORMAL_CONSUMPTION
  | typeof PEAK_DEMAND_EXCEEDED
  | typeof ENERGY_DEVIATION
  | typeof METER_TAMPER
  | typeof CONFIG_CHANGE
  | typeof FIRMWARE_MISMATCH
  | typeof GENERATION_LOW
  | typeof INVERTER_FAULT
  | typeof GRID_EXPORT_LIMIT
  | typeof BUS_ERROR
  | typeof MODBUS_TIMEOUT
  | typeof CRC_ERROR
  | typeof FREQUENCY_OUT_OF_RANGE
  | typeof OVERCURRENT
  | typeof BREAKER_TRIP
  | typeof NEUTRAL_FAULT;

export const ALL_ALERT_TYPE_CODES: AlertTypeCode[] = [
  METER_OFFLINE,
  CONCENTRATOR_OFFLINE,
  COMM_DEGRADED,
  VOLTAGE_OUT_OF_RANGE,
  LOW_POWER_FACTOR,
  HIGH_THD,
  PHASE_IMBALANCE,
  ABNORMAL_CONSUMPTION,
  PEAK_DEMAND_EXCEEDED,
  ENERGY_DEVIATION,
  METER_TAMPER,
  CONFIG_CHANGE,
  FIRMWARE_MISMATCH,
  GENERATION_LOW,
  INVERTER_FAULT,
  GRID_EXPORT_LIMIT,
  BUS_ERROR,
  MODBUS_TIMEOUT,
  CRC_ERROR,
  FREQUENCY_OUT_OF_RANGE,
  OVERCURRENT,
  BREAKER_TRIP,
  NEUTRAL_FAULT,
];

/** Family grouping for UI display */
export const ALERT_FAMILIES: Record<string, AlertTypeCode[]> = {
  communication: [METER_OFFLINE, CONCENTRATOR_OFFLINE, COMM_DEGRADED],
  electrical: [VOLTAGE_OUT_OF_RANGE, LOW_POWER_FACTOR, HIGH_THD, PHASE_IMBALANCE, FREQUENCY_OUT_OF_RANGE, OVERCURRENT, BREAKER_TRIP, NEUTRAL_FAULT],
  consumption: [ABNORMAL_CONSUMPTION, PEAK_DEMAND_EXCEEDED, ENERGY_DEVIATION],
  operational: [METER_TAMPER, CONFIG_CHANGE, FIRMWARE_MISMATCH],
  generation: [GENERATION_LOW, INVERTER_FAULT, GRID_EXPORT_LIMIT],
  bus: [BUS_ERROR, MODBUS_TIMEOUT, CRC_ERROR],
};
