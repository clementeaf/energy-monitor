import type { SiteKind } from '../../common/constants/site-metadata';
import type { BuildingImportErrorCode } from './building-import.types';

const ISO_COUNTRY_REGEX = /^[A-Z]{2}$/;

/**
 * Validates required building name.
 * @param name - Building name
 * @returns Error code or null
 */
export function validateName(name: string | null): BuildingImportErrorCode | null {
  if (!name?.trim()) {
    return 'MISSING_NAME';
  }
  return null;
}

/**
 * Validates required building code.
 * @param code - Building code
 * @returns Error code or null
 */
export function validateCode(code: string | null): BuildingImportErrorCode | null {
  if (!code?.trim()) {
    return 'MISSING_CODE';
  }
  return null;
}

/**
 * Validates optional area value.
 * @param areaSqm - Parsed area or NaN
 * @returns Error code or null
 */
export function validateAreaSqm(areaSqm: number | null): BuildingImportErrorCode | null {
  if (areaSqm === null) {
    return null;
  }
  if (Number.isNaN(areaSqm) || areaSqm < 0) {
    return 'INVALID_AREA';
  }
  return null;
}

/**
 * Validates optional ISO country code.
 * @param countryCode - Normalized country code
 * @returns Error code or null
 */
export function validateCountryCode(countryCode: string | null): BuildingImportErrorCode | null {
  if (!countryCode) {
    return null;
  }
  if (!ISO_COUNTRY_REGEX.test(countryCode)) {
    return 'INVALID_COUNTRY';
  }
  return null;
}

/**
 * Validates optional site kind when provided in raw cells.
 * @param rawSiteKind - Raw site kind cell
 * @param normalized - Normalized site kind
 * @returns Error code or null
 */
export function validateSiteKind(
  rawSiteKind: string | null,
  normalized: SiteKind | null,
): BuildingImportErrorCode | null {
  if (!rawSiteKind?.trim()) {
    return null;
  }
  if (!normalized) {
    return 'INVALID_SITE_KIND';
  }
  return null;
}

/**
 * Validates optional timezone string length.
 * @param timezone - Timezone cell
 * @returns Error code or null
 */
export function validateTimezone(timezone: string | null): BuildingImportErrorCode | null {
  if (!timezone?.trim()) {
    return null;
  }
  if (timezone.trim().length > 50) {
    return 'INVALID_TIMEZONE';
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
  areaSqm: number | null;
  countryCode: string | null;
  rawSiteKind: string | null;
  siteKind: SiteKind | null;
  timezone: string | null;
}): BuildingImportErrorCode[] {
  const errors: BuildingImportErrorCode[] = [];
  const push = (code: BuildingImportErrorCode | null): void => {
    if (code && !errors.includes(code)) {
      errors.push(code);
    }
  };

  push(validateName(fields.name));
  push(validateCode(fields.code));
  push(validateAreaSqm(fields.areaSqm));
  push(validateCountryCode(fields.countryCode));
  push(validateSiteKind(fields.rawSiteKind, fields.siteKind));
  push(validateTimezone(fields.timezone));

  return errors;
}
