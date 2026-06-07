import { EXPECTED_PHASE_BY_MODEL, REQUIRED_CSV_HEADERS } from './constants.mjs';

/**
 * Parse positive integer from env-like value with fallback.
 * @param {string | undefined} value - Raw value
 * @param {number} fallback - Default when invalid
 * @returns {number}
 */
export function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Trim optional CSV text field.
 * @param {unknown} value - Cell value
 * @returns {string | null}
 */
export function parseOptionalText(value) {
  if (value == null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Parse required CSV text field.
 * @param {unknown} value - Cell value
 * @param {string} fieldName - Column name for errors
 * @param {number} rowNumber - 1-based row index
 * @returns {string}
 */
export function parseRequiredText(value, fieldName, rowNumber) {
  const parsed = parseOptionalText(value);
  if (parsed == null) {
    throw new Error(`Row ${rowNumber}: ${fieldName} is required`);
  }
  return parsed;
}

/**
 * Parse decimal CSV field (comma decimal separator supported).
 * @param {unknown} value - Cell value
 * @param {string} fieldName - Column name
 * @param {number} rowNumber - Row index
 * @param {{ required?: boolean; integer?: boolean }} [options] - Parse options
 * @returns {number | null}
 */
export function parseDecimal(value, fieldName, rowNumber, options = {}) {
  const parsed = parseOptionalText(value);
  if (parsed == null) {
    if (options.required) {
      throw new TypeError(`Row ${rowNumber}: ${fieldName} is required`);
    }
    return null;
  }
  const normalized = parsed.replace(',', '.');
  const numberValue = options.integer ? Number.parseInt(normalized, 10) : Number(normalized);
  if (Number.isNaN(numberValue)) {
    throw new TypeError(`Row ${rowNumber}: ${fieldName} is not numeric`);
  }
  return numberValue;
}

/**
 * Parse ISO timestamp from CSV.
 * @param {unknown} value - Cell value
 * @param {number} rowNumber - Row index
 * @returns {string} ISO8601 string
 */
export function parseTimestamp(value, rowNumber) {
  const parsed = parseRequiredText(value, 'timestamp', rowNumber);
  const timestamp = new Date(parsed);
  if (Number.isNaN(timestamp.getTime())) {
    throw new TypeError(`Row ${rowNumber}: timestamp is invalid`);
  }
  return timestamp.toISOString();
}

/**
 * Map CSV phase_type to monitoreo-v2 enum.
 * @param {string} phaseType - CSV value (1P/3P)
 * @returns {'single_phase' | 'three_phase'}
 */
export function mapPhaseType(phaseType) {
  return phaseType === '1P' ? 'single_phase' : 'three_phase';
}

/**
 * Resolve building code from meter_id prefix.
 * @param {string} meterCode - e.g. MG-001, SC52-012
 * @returns {string} Building code (MG, MM, OT, SC52, SC53)
 */
export function resolveBuildingCode(meterCode) {
  if (meterCode.startsWith('SC52-')) {
    return 'SC52';
  }
  if (meterCode.startsWith('SC53-')) {
    return 'SC53';
  }
  const match = /^([A-Z]+)-/.exec(meterCode);
  if (!match) {
    throw new Error(`Cannot resolve building for meter ${meterCode}`);
  }
  return match[1];
}

/**
 * Validate CSV header row contains required columns.
 * @param {string[]} columns - Parsed header columns
 * @returns {void}
 */
export function assertHeaders(columns) {
  const normalized = new Set(
    columns.map((value) =>
      value.trim().replace(/^\uFEFF/, '').replace(/^ï»¿/, ''),
    ),
  );
  const missing = REQUIRED_CSV_HEADERS.filter((header) => !normalized.has(header));
  if (missing.length > 0) {
    throw new Error(`CSV header missing columns: ${missing.join(', ')}`);
  }
}

/**
 * Check timestamp within optional from/to window.
 * @param {string} tsIso - ISO timestamp
 * @param {string | null} fromDate - Inclusive lower bound
 * @param {string | null} toDate - Inclusive upper bound
 * @returns {boolean}
 */
export function inDateRange(tsIso, fromDate, toDate) {
  if (!fromDate && !toDate) {
    return true;
  }
  const t = new Date(tsIso).getTime();
  if (fromDate && t < new Date(fromDate).getTime()) {
    return false;
  }
  if (toDate && t > new Date(toDate).getTime()) {
    return false;
  }
  return true;
}

/**
 * Normalize one CSV row into catalog + reading shapes.
 * @param {Record<string, string>} record - Parsed CSV row
 * @param {number} rowNumber - 1-based row index
 * @returns {{ catalog: MeterCatalogRow; reading: ReadingRow }}
 */
export function normalizeRecord(record, rowNumber) {
  const meterCode = parseRequiredText(record.meter_id, 'meter_id', rowNumber);
  const timestamp = parseTimestamp(record.timestamp, rowNumber);
  const phaseTypeRaw = parseRequiredText(record.phase_type, 'phase_type', rowNumber);
  const model = parseRequiredText(record.model, 'model', rowNumber);
  const expectedPhase = EXPECTED_PHASE_BY_MODEL[model];
  if (expectedPhase && phaseTypeRaw !== expectedPhase) {
    throw new TypeError(
      `Row ${rowNumber}: model ${model} must use phase_type ${expectedPhase}`,
    );
  }

  const powerKw = parseDecimal(record.power_kW, 'power_kW', rowNumber, { required: true });
  if (powerKw != null && powerKw < 0) {
    throw new TypeError(`Row ${rowNumber}: power_kW cannot be negative`);
  }

  const catalog = {
    code: meterCode,
    buildingCode: resolveBuildingCode(meterCode),
    name: parseRequiredText(record.store_name, 'store_name', rowNumber),
    model,
    phaseType: mapPhaseType(phaseTypeRaw),
    modbusAddress: parseDecimal(record.modbus_address, 'modbus_address', rowNumber, {
      required: true,
      integer: true,
    }),
    uplinkRoute: parseRequiredText(record.uplink_route, 'uplink_route', rowNumber),
    storeType: parseRequiredText(record.store_type, 'store_type', rowNumber),
    centerName: parseRequiredText(record.center_name, 'center_name', rowNumber),
    centerType: parseRequiredText(record.center_type, 'center_type', rowNumber),
  };

  const reading = {
    meterCode,
    timestamp,
    voltageL1: parseDecimal(record.voltage_L1, 'voltage_L1', rowNumber),
    voltageL2: parseDecimal(record.voltage_L2, 'voltage_L2', rowNumber),
    voltageL3: parseDecimal(record.voltage_L3, 'voltage_L3', rowNumber),
    currentL1: parseDecimal(record.current_L1, 'current_L1', rowNumber),
    currentL2: parseDecimal(record.current_L2, 'current_L2', rowNumber),
    currentL3: parseDecimal(record.current_L3, 'current_L3', rowNumber),
    powerKw,
    reactivePowerKvar: parseDecimal(record.reactive_power_kvar, 'reactive_power_kvar', rowNumber),
    powerFactor: parseDecimal(record.power_factor, 'power_factor', rowNumber),
    frequencyHz: parseDecimal(record.frequency_Hz, 'frequency_Hz', rowNumber),
    energyKwhTotal: parseDecimal(record.energy_kWh_total, 'energy_kWh_total', rowNumber, {
      required: true,
    }),
  };

  return { catalog, reading };
}

/**
 * @typedef {Object} MeterCatalogRow
 * @property {string} code
 * @property {string} buildingCode
 * @property {string} name
 * @property {string} model
 * @property {'single_phase' | 'three_phase'} phaseType
 * @property {number | null} modbusAddress
 * @property {string} uplinkRoute
 * @property {string} storeType
 * @property {string} centerName
 * @property {string} centerType
 */

/**
 * @typedef {Object} ReadingRow
 * @property {string} meterCode
 * @property {string} timestamp
 * @property {number | null} voltageL1
 * @property {number | null} voltageL2
 * @property {number | null} voltageL3
 * @property {number | null} currentL1
 * @property {number | null} currentL2
 * @property {number | null} currentL3
 * @property {number | null} powerKw
 * @property {number | null} reactivePowerKvar
 * @property {number | null} powerFactor
 * @property {number | null} frequencyHz
 * @property {number | null} energyKwhTotal
 */
