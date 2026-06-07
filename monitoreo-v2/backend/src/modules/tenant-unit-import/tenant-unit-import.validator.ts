import type { TenantUnitImportErrorCode } from './tenant-unit-import.types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates required tenant unit name.
 * @param name - Unit name
 * @returns Error code or null
 */
export function validateName(name: string | null): TenantUnitImportErrorCode | null {
  if (!name?.trim()) {
    return 'MISSING_NAME';
  }
  return null;
}

/**
 * Validates required unit code.
 * @param unitCode - Unit code
 * @returns Error code or null
 */
export function validateUnitCode(unitCode: string | null): TenantUnitImportErrorCode | null {
  if (!unitCode?.trim()) {
    return 'MISSING_UNIT_CODE';
  }
  return null;
}

/**
 * Validates building reference columns presence.
 * @param buildingCode - Building code cell
 * @param externalSiteId - External site id cell
 * @returns Error code or null
 */
export function validateBuildingRef(
  buildingCode: string | null,
  externalSiteId: string | null,
): TenantUnitImportErrorCode | null {
  if (!buildingCode?.trim() && !externalSiteId?.trim()) {
    return 'MISSING_BUILDING_REF';
  }
  return null;
}

/**
 * Validates optional contact email format.
 * @param contactEmail - Contact email cell
 * @returns Error code or null
 */
export function validateContactEmail(contactEmail: string | null): TenantUnitImportErrorCode | null {
  if (!contactEmail?.trim()) {
    return null;
  }
  if (!EMAIL_REGEX.test(contactEmail.trim())) {
    return 'INVALID_EMAIL';
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
  unitCode: string | null;
  buildingCode: string | null;
  externalSiteId: string | null;
  contactEmail: string | null;
}): TenantUnitImportErrorCode[] {
  const errors: TenantUnitImportErrorCode[] = [];
  const push = (code: TenantUnitImportErrorCode | null): void => {
    if (code && !errors.includes(code)) {
      errors.push(code);
    }
  };

  push(validateName(fields.name));
  push(validateUnitCode(fields.unitCode));
  push(validateBuildingRef(fields.buildingCode, fields.externalSiteId));
  push(validateContactEmail(fields.contactEmail));

  return errors;
}
