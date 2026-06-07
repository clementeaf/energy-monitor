import type { RegisterMappingInput } from '../lib/normalization.service';

/**
 * Global siemens-poc3000 MQTT / IoT EAV variable → readings field mappings.
 * Mirrors register_mappings seed (protocol=mqtt, device_profile=siemens-poc3000).
 */
export const SIEMENS_POC3000_IOT_MAPPINGS: RegisterMappingInput[] = [
  { registerKey: 'voltage_l1', targetField: 'voltage_l1', scaleFactor: 1, unit: 'V' },
  { registerKey: 'voltage_l2', targetField: 'voltage_l2', scaleFactor: 1, unit: 'V' },
  { registerKey: 'voltage_l3', targetField: 'voltage_l3', scaleFactor: 1, unit: 'V' },
  { registerKey: 'current_l1', targetField: 'current_l1', scaleFactor: 1, unit: 'A' },
  { registerKey: 'current_l2', targetField: 'current_l2', scaleFactor: 1, unit: 'A' },
  { registerKey: 'current_l3', targetField: 'current_l3', scaleFactor: 1, unit: 'A' },
  { registerKey: 'active_power_w', targetField: 'power_kw', scaleFactor: 0.001, unit: 'kW' },
  { registerKey: 'reactive_power_var', targetField: 'reactive_power_kvar', scaleFactor: 0.001, unit: 'kVAR' },
  { registerKey: 'power_factor', targetField: 'power_factor', scaleFactor: 1 },
  { registerKey: 'frequency_hz', targetField: 'frequency_hz', scaleFactor: 1, unit: 'Hz' },
  { registerKey: 'energy_import_wh', targetField: 'energy_kwh_total', scaleFactor: 0.001, unit: 'kWh' },
  { registerKey: 'thd_voltage_l1_pct', targetField: 'thd_voltage_pct', scaleFactor: 1, unit: '%' },
  { registerKey: 'thd_current_l1_pct', targetField: 'thd_current_pct', scaleFactor: 1, unit: '%' },
  { registerKey: 'peak_demand_w', targetField: 'peak_demand_kw', scaleFactor: 0.001, unit: 'kW' },
];

/**
 * Normalizes a pivoted IoT variable row to readings units via NormalizationService.
 * @param apply - NormalizationService.apply bound or injected
 * @param raw - Pivoted EAV columns keyed by variable_name
 * @param mappings - Optional override (default siemens-poc3000)
 * @returns Normalized numeric fields
 */
export function normalizeIotVariableRow(
  apply: (
    mappings: RegisterMappingInput[],
    raw: Record<string, unknown>,
  ) => Record<string, number>,
  raw: Record<string, unknown>,
  mappings: RegisterMappingInput[] = SIEMENS_POC3000_IOT_MAPPINGS,
): Record<string, number> {
  return apply(mappings, raw);
}
