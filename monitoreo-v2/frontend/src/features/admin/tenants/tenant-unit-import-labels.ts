/** Spanish labels for tenant unit import validation error codes. */
const TENANT_UNIT_IMPORT_ERROR_LABELS: Record<string, string> = {
  MISSING_NAME: 'Nombre obligatorio',
  MISSING_UNIT_CODE: 'Código de unidad obligatorio',
  MISSING_BUILDING_REF: 'Referencia de edificio obligatoria',
  BUILDING_NOT_FOUND: 'Edificio no encontrado',
  BUILDING_REF_MISMATCH: 'Código e ID externo apuntan a edificios distintos',
  INVALID_EMAIL: 'Email de contacto inválido',
  DUPLICATE_UNIT_CODE: 'Código de unidad ya registrado en el edificio',
  DUPLICATE_UNIT_CODE_IN_FILE: 'Código duplicado en el archivo',
  COMMIT_FAILED: 'Error al crear locatario',
};

/**
 * Returns human-readable Spanish labels for import error codes.
 * @param codes - Backend error code strings
 * @returns Comma-separated labels
 */
export function formatTenantUnitImportErrorCodes(codes: string[]): string {
  if (codes.length === 0) return '—';
  return codes.map((code) => TENANT_UNIT_IMPORT_ERROR_LABELS[code] ?? code).join(', ');
}

export {
  USER_IMPORT_STATUS_LABELS as TENANT_UNIT_IMPORT_STATUS_LABELS,
  USER_IMPORT_JOB_STATUS_LABELS as TENANT_UNIT_IMPORT_JOB_STATUS_LABELS,
} from '../users/user-import-labels';
