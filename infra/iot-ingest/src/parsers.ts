import type { ParsedReading, PayloadParser } from './types';

/**
 * Variables we extract from any payload.
 * Only these keys produce EAV rows — everything else is ignored.
 */
const ACCEPTED_VARIABLES = new Set([
  'voltage_l1', 'voltage_l2', 'voltage_l3',
  'current_l1', 'current_l2', 'current_l3',
  'active_power_w', 'reactive_power_var', 'apparent_power_va',
  'power_factor', 'frequency_hz',
  'energy_import_wh', 'energy_export_wh',
  'thd_voltage_l1_pct', 'thd_voltage_l2_pct', 'thd_voltage_l3_pct',
  'thd_current_l1_pct', 'thd_current_l2_pct', 'thd_current_l3_pct',
  'peak_demand_w',
]);

/**
 * Siemens POC3000 internal_name → normalized variable name.
 * Only entries whose target is in ACCEPTED_VARIABLES are kept.
 */
const POC3000_MAP: ReadonlyMap<string, string> = new Map([
  ['V_LN/Inst/Value/L1N', 'voltage_l1'],
  ['V_LN/Inst/Value/L2N', 'voltage_l2'],
  ['V_LN/Inst/Value/L3N', 'voltage_l3'],
  ['I/Inst/Value/L1', 'current_l1'],
  ['I/Inst/Value/L2', 'current_l2'],
  ['I/Inst/Value/L3', 'current_l3'],
  ['Power/W/Inst/Value/Sum', 'active_power_w'],
  ['Power/var/Q1/Inst/Value/Sum', 'reactive_power_var'],
  ['Power/VA/Inst/Value/Sum', 'apparent_power_va'],
  ['Power/Factor/Inst/Value/AVG', 'power_factor'],
  ['Frequency/Inst/Value/Common', 'frequency_hz'],
  ['Energy/Wh/Import/OnPeakTariff/Sum', 'energy_import_wh'],
  ['Energy/Wh/Export/OnPeakTariff/Sum', 'energy_export_wh'],
  ['THD/V_LN/Inst/Value/L1N#', 'thd_voltage_l1_pct'],
  ['THD/V_LN/Inst/Value/L2N#', 'thd_voltage_l2_pct'],
  ['THD/V_LN/Inst/Value/L3N#', 'thd_voltage_l3_pct'],
  ['THD/I/Inst/Value/L2#', 'thd_current_l1_pct'],
  ['THD/I/Inst/Value/L3#', 'thd_current_l2_pct'],
  ['Power/W/MeanValue/Max/Sum', 'peak_demand_w'],
]);

// ── Helpers ─────────────────────────────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isString = (v: unknown): v is string => typeof v === 'string';

const toFiniteNumber = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

const extractVariables = (
  entries: Iterable<[string, unknown]>,
  keyMap?: ReadonlyMap<string, string>,
): ReadonlyMap<string, number> => {
  const out = new Map<string, number>();
  for (const [rawKey, rawValue] of entries) {
    const variableName = keyMap?.get(rawKey) ?? rawKey;
    const num = toFiniteNumber(rawValue);
    // ponytail: only accepted variables with finite values
    if (num !== null && ACCEPTED_VARIABLES.has(variableName)) {
      out.set(variableName, num);
    }
  }
  return out;
};

// ── Parsers ─────────────────────────────────────────────

/**
 * Siemens POC3000 format:
 * { item_id, item_name, timestamp, _embedded: { item: [{ internal_name, value, quality }] } }
 */
export const parsePoc3000: PayloadParser = (raw) => {
  if (!isRecord(raw)) return null;
  if (!isRecord(raw._embedded)) return null;
  if (!Array.isArray((raw._embedded as Record<string, unknown>).item)) return null;

  const embedded = raw._embedded as Record<string, unknown>;
  const items = embedded.item as unknown[];

  if (!isString(raw.item_id) || !isString(raw.timestamp)) return null;

  const validItems = items
    .filter((it): it is Record<string, unknown> => isRecord(it))
    .filter((it) => it.quality === 'valid')
    .map((it) => [String(it.internal_name), it.value] as [string, unknown]);

  const variables = extractVariables(validItems, POC3000_MAP);

  return {
    deviceId: raw.item_id as string,
    timestamp: raw.timestamp as string,
    variables,
  };
};

/**
 * Generic flat format:
 * { deviceId|meterId, timestamp, variables: { voltage_l1: 220.5, ... } }
 * Also accepts variables as top-level keys (no nested object).
 */
export const parseGenericFlat: PayloadParser = (raw) => {
  if (!isRecord(raw)) return null;

  const deviceId = raw.deviceId ?? raw.meterId ?? raw.device_id;
  if (!isString(deviceId) || !isString(raw.timestamp)) return null;

  const variablesSource = isRecord(raw.variables)
    ? Object.entries(raw.variables as Record<string, unknown>)
    : Object.entries(raw).filter(([k]) => ACCEPTED_VARIABLES.has(k));

  const variables = extractVariables(variablesSource);

  return {
    deviceId: deviceId as string,
    timestamp: raw.timestamp as string,
    variables,
  };
};

/**
 * IoT Rule direct format (Siemens SENTRON / flat Spanish keys):
 * { voltajeL1N_V: 218, corrienteL1_A: 1.5, ..., mqtt_topic: "powercenter/data", received_at: 1782485212587 }
 *
 * No deviceId or timestamp fields — uses mqtt_topic as device key and received_at (epoch ms) as timestamp.
 */
const IOTRULE_DIRECT_MAP: ReadonlyMap<string, string> = new Map([
  ['voltajeL1N_V', 'voltage_l1'],
  ['voltajeL2N_V', 'voltage_l2'],
  ['voltajeL3N_V', 'voltage_l3'],
  ['corrienteL1_A', 'current_l1'],
  ['corrienteL2_A', 'current_l2'],
  ['corrienteL3_A', 'current_l3'],
  ['potActTotal_W', 'active_power_w'],
  ['potReacTotal_var', 'reactive_power_var'],
  ['potAparTotal_VA', 'apparent_power_va'],
  ['fpTotal', 'power_factor'],
  ['frecuencia_Hz', 'frequency_hz'],
]);

// ponytail: detect by presence of spanish-keyed electrical vars + received_at
const IOTRULE_FINGERPRINT = ['received_at', 'voltajeL1N_V'] as const;

export const parseIotRuleDirect: PayloadParser = (raw) => {
  if (!isRecord(raw)) return null;
  if (!IOTRULE_FINGERPRINT.every((k) => k in raw)) return null;

  const receivedAt = toFiniteNumber(raw.received_at);
  if (receivedAt === null) return null;

  // ponytail: prefer device_client_id (injected by IoT Rule via clientid()) over mqtt_topic
  const deviceId = isString(raw.device_client_id)
    ? raw.device_client_id
    : isString(raw.mqtt_topic) ? raw.mqtt_topic : 'unknown';
  const variables = extractVariables(Object.entries(raw), IOTRULE_DIRECT_MAP);

  return {
    deviceId,
    timestamp: new Date(receivedAt).toISOString(),
    variables,
  };
};

// ── Parser chain ────────────────────────────────────────

const PARSERS: readonly PayloadParser[] = [parsePoc3000, parseIotRuleDirect, parseGenericFlat];

/**
 * Runs each parser in order. First non-null result wins.
 * Returns null when no parser recognizes the payload.
 */
export const parsePayload = (raw: unknown): ParsedReading | null => {
  for (const parser of PARSERS) {
    const result = parser(raw);
    if (result !== null) return result;
  }
  return null;
};

export { ACCEPTED_VARIABLES };
