/** Spanish labels for building import validation error codes. */
const BUILDING_IMPORT_ERROR_LABELS: Record<string, string> = {
  MISSING_NAME: 'Nombre obligatorio',
  MISSING_CODE: 'Código obligatorio',
  INVALID_AREA: 'Superficie inválida',
  INVALID_COUNTRY: 'Código de país inválido (ISO 3166-1 alpha-2)',
  INVALID_SITE_KIND: 'Tipo de sitio inválido',
  INVALID_TIMEZONE: 'Zona horaria inválida',
  REGION_NOT_FOUND: 'Región no encontrada',
  DUPLICATE_CODE: 'Código ya registrado',
  DUPLICATE_CODE_IN_FILE: 'Código duplicado en el archivo',
  DUPLICATE_EXTERNAL_SITE_ID: 'Site ID externo ya registrado',
  DUPLICATE_EXTERNAL_SITE_ID_IN_FILE: 'Site ID duplicado en el archivo',
  COMMIT_FAILED: 'Error al crear edificio',
};

/**
 * Returns human-readable Spanish labels for import error codes.
 * @param codes - Backend error code strings
 * @returns Comma-separated labels
 */
export function formatBuildingImportErrorCodes(codes: string[]): string {
  if (codes.length === 0) return '—';
  return codes.map((code) => BUILDING_IMPORT_ERROR_LABELS[code] ?? code).join(', ');
}

export {
  USER_IMPORT_STATUS_LABELS as BUILDING_IMPORT_STATUS_LABELS,
  USER_IMPORT_JOB_STATUS_LABELS as BUILDING_IMPORT_JOB_STATUS_LABELS,
} from '../admin/users/user-import-labels';
