/** PASA tenant and default CSV catalog for local ingest. */

export const PASA_TENANT_ID = 'b0000002-0000-0000-0000-000000000001';

/** Default window: January 2026 (one calendar month). */
export const DEFAULT_FROM_DATE = '2026-01-01T00:00:00.000Z';
export const DEFAULT_TO_DATE = '2026-01-31T23:59:59.999Z';

/** Known Drive CSV files (download to CSV_DIR). */
export const PASA_CSV_FILES = [
  'MALL_GRANDE_446_completo.csv',
  'MALL_MEDIANO_254_completo.csv',
  'OUTLET_70_anual.csv',
  'SC52_StripCenter_anual.csv',
  'SC53_StripCenter_anual.csv',
];

export const REQUIRED_CSV_HEADERS = [
  'timestamp',
  'meter_id',
  'center_name',
  'center_type',
  'store_type',
  'store_name',
  'model',
  'phase_type',
  'uplink_route',
  'modbus_address',
  'voltage_L1',
  'voltage_L2',
  'voltage_L3',
  'current_L1',
  'current_L2',
  'current_L3',
  'power_kW',
  'reactive_power_kvar',
  'power_factor',
  'frequency_Hz',
  'energy_kWh_total',
];

export const EXPECTED_PHASE_BY_MODEL = {
  PAC1670: '3P',
  PAC1651: '1P',
};
