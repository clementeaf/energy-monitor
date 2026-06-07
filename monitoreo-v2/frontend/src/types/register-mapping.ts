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

export interface ProtocolType {
  code: string;
  label: string;
  description: string | null;
}

export interface RegisterMapping {
  id: string;
  tenantId: string | null;
  protocol: string;
  deviceProfile: string;
  registerKey: string;
  targetField: string;
  scaleFactor: string;
  unit: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterMappingQueryParams {
  protocol?: string;
  deviceProfile?: string;
}

export interface CreateRegisterMappingPayload {
  protocol: string;
  deviceProfile: string;
  registerKey: string;
  targetField: string;
  scaleFactor: number;
  unit?: string;
  tenantId?: string;
  isGlobalTemplate?: boolean;
}

export interface UpdateRegisterMappingPayload {
  protocol?: string;
  deviceProfile?: string;
  registerKey?: string;
  targetField?: string;
  scaleFactor?: number;
  unit?: string | null;
}
