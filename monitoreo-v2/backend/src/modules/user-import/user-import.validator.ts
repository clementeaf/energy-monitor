import type { UserImportAuthProvider, UserImportErrorCode } from './user-import.types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Validates email format.
 * @param email - Normalized email
 * @returns Error code or null
 */
export function validateEmailFormat(email: string | null): UserImportErrorCode | null {
  if (!email) {
    return 'MISSING_REQUIRED_FIELD';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'INVALID_EMAIL';
  }
  return null;
}

/**
 * Validates auth provider value.
 * @param provider - Normalized provider
 * @returns Error code or null
 */
export function validateAuthProvider(
  provider: UserImportAuthProvider | null,
): UserImportErrorCode | null {
  if (!provider) {
    return 'INVALID_PROVIDER';
  }
  return null;
}

/**
 * Validates role slug presence.
 * @param roleSlug - Role slug cell
 * @returns Error code or null
 */
export function validateRoleSlug(roleSlug: string | null): UserImportErrorCode | null {
  if (!roleSlug?.trim()) {
    return 'MISSING_ROLE';
  }
  return null;
}

/**
 * Validates optional phone in E.164 format.
 * @param phone - Phone cell
 * @returns Error code or null
 */
export function validatePhone(phone: string | null): UserImportErrorCode | null {
  if (!phone?.trim()) {
    return null;
  }
  const normalized = phone.trim().replace(/\s/g, '');
  if (!E164_REGEX.test(normalized)) {
    return 'INVALID_PHONE';
  }
  return null;
}

/**
 * Runs field-level validations and returns accumulated error codes.
 * @param fields - Parsed field values
 * @returns Unique error codes for the row
 */
export function collectFieldValidationErrors(fields: {
  email: string | null;
  authProvider: UserImportAuthProvider | null;
  roleSlug: string | null;
  phone: string | null;
}): UserImportErrorCode[] {
  const errors: UserImportErrorCode[] = [];
  const push = (code: UserImportErrorCode | null): void => {
    if (code && !errors.includes(code)) {
      errors.push(code);
    }
  };

  push(validateEmailFormat(fields.email));
  push(validateAuthProvider(fields.authProvider));
  push(validateRoleSlug(fields.roleSlug));
  push(validatePhone(fields.phone));

  return errors;
}
