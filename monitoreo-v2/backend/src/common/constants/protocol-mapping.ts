export const PROTOCOL_TYPE_CODES = ['modbus', 'mqtt', 'bacnet', 'snmp', 'api'] as const;
export type ProtocolTypeCode = (typeof PROTOCOL_TYPE_CODES)[number];

export const READING_TARGET_FIELDS = [
  'power_kw',
  'reactive_power_kvar',
  'power_factor',
  'frequency_hz',
  'energy_kwh_total',
  'voltage_l1',
  'voltage_l2',
  'voltage_l3',
  'current_l1',
  'current_l2',
  'current_l3',
  'thd_voltage_pct',
  'thd_current_pct',
  'phase_imbalance_pct',
] as const;
export type ReadingTargetField = (typeof READING_TARGET_FIELDS)[number];

export const DEVICE_PROFILES = ['pac1670', 'siemens-poc3000'] as const;
export type DeviceProfile = (typeof DEVICE_PROFILES)[number];
