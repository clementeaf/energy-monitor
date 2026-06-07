import type { LoadCategory } from '../../common/constants/site-metadata';
import type { MeterPhaseType } from '../platform/entities/meter.entity';
import type { MeterImportErrorCode } from './meter-import.types';

/**
 * Validates required meter name.
 * @param name - Meter name
 * @returns Error code or null
 */
export function validateName(name: string | null): MeterImportErrorCode | null {
  if (!name?.trim()) {
    return 'MISSING_NAME';
  }
  return null;
}

/**
 * Validates required meter code.
 * @param code - Meter code
 * @returns Error code or null
 */
export function validateCode(code: string | null): MeterImportErrorCode | null {
  if (!code?.trim()) {
    return 'MISSING_CODE';
  }
  return null;
}

/**
 * Validates building reference columns are present.
 * @param buildingCode - Building code cell
 * @param externalSiteId - External site id cell
 * @returns Error code or null
 */
export function validateBuildingRef(
  buildingCode: string | null,
  externalSiteId: string | null,
): MeterImportErrorCode | null {
  if (!buildingCode?.trim() && !externalSiteId?.trim()) {
    return 'MISSING_BUILDING_REF';
  }
  return null;
}

/**
 * Validates optional phase type when provided in raw cells.
 * @param rawPhaseType - Raw phase cell
 * @param normalized - Normalized phase type
 * @returns Error code or null
 */
export function validatePhaseType(
  rawPhaseType: string | null,
  normalized: MeterPhaseType | null,
): MeterImportErrorCode | null {
  if (!rawPhaseType?.trim()) {
    return null;
  }
  if (!normalized) {
    return 'INVALID_PHASE_TYPE';
  }
  return null;
}

/**
 * Validates optional load category when provided in raw cells.
 * @param rawLoadCategory - Raw load category cell
 * @param normalized - Normalized load category
 * @returns Error code or null
 */
export function validateLoadCategory(
  rawLoadCategory: string | null,
  normalized: LoadCategory | null,
): MeterImportErrorCode | null {
  if (!rawLoadCategory?.trim()) {
    return null;
  }
  if (!normalized) {
    return 'INVALID_LOAD_CATEGORY';
  }
  return null;
}

/**
 * Validates optional modbus address when provided.
 * @param modbusAddress - Parsed modbus address
 * @param rawModbus - Raw modbus cell
 * @returns Error code or null
 */
export function validateModbusAddress(
  modbusAddress: number | null,
  rawModbus: string | null,
): MeterImportErrorCode | null {
  if (!rawModbus?.trim()) {
    return null;
  }
  if (modbusAddress === null || Number.isNaN(modbusAddress) || modbusAddress < 0 || modbusAddress > 32767) {
    return 'INVALID_MODBUS_ADDRESS';
  }
  return null;
}

/**
 * Validates optional is_active when provided in raw cells.
 * @param rawIsActive - Raw active cell
 * @param normalized - Parsed boolean
 * @returns Error code or null
 */
export function validateIsActive(
  rawIsActive: string | null,
  normalized: boolean | null,
): MeterImportErrorCode | null {
  if (!rawIsActive?.trim()) {
    return null;
  }
  if (normalized === null) {
    return 'INVALID_IS_ACTIVE';
  }
  return null;
}

/**
 * Runs field-level validations and returns accumulated error codes.
 * @param fields - Parsed field values
 * @returns Unique error codes for the row
 */
export function collectFieldValidationErrors(fields: {
  name: string | null;
  code: string | null;
  buildingCode: string | null;
  externalSiteId: string | null;
  rawPhaseType: string | null;
  phaseType: MeterPhaseType | null;
  rawLoadCategory: string | null;
  loadCategory: LoadCategory | null;
  modbusAddress: number | null;
  rawModbusAddress: string | null;
  rawIsActive: string | null;
  isActive: boolean | null;
}): MeterImportErrorCode[] {
  const errors: MeterImportErrorCode[] = [];
  const push = (code: MeterImportErrorCode | null): void => {
    if (code && !errors.includes(code)) {
      errors.push(code);
    }
  };

  push(validateName(fields.name));
  push(validateCode(fields.code));
  push(validateBuildingRef(fields.buildingCode, fields.externalSiteId));
  push(validatePhaseType(fields.rawPhaseType, fields.phaseType));
  push(validateLoadCategory(fields.rawLoadCategory, fields.loadCategory));
  push(validateModbusAddress(fields.modbusAddress, fields.rawModbusAddress));
  push(validateIsActive(fields.rawIsActive, fields.isActive));

  return errors;
}
