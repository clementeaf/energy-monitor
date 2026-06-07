/** Spanish labels for user import validation error codes. */
const USER_IMPORT_ERROR_LABELS: Record<string, string> = {
  INVALID_EMAIL: 'Email inválido',
  INVALID_PROVIDER: 'Proveedor OAuth inválido',
  MISSING_ROLE: 'Rol obligatorio',
  INVALID_PHONE: 'Teléfono inválido',
  ROLE_NOT_FOUND: 'Rol no encontrado en la empresa',
  BUILDING_NOT_FOUND: 'Edificio no encontrado',
  HIERARCHY_DENIED: 'No puede asignar un rol superior al suyo',
  DUPLICATE_EMAIL: 'Email ya registrado',
  DUPLICATE_EMAIL_IN_FILE: 'Email duplicado en el archivo',
  MISSING_REQUIRED_FIELD: 'Campo obligatorio faltante',
  COMMIT_FAILED: 'Error al crear usuario',
};

/**
 * Returns human-readable Spanish labels for import error codes.
 * @param codes - Backend error code strings
 * @returns Comma-separated labels
 */
export function formatUserImportErrorCodes(codes: string[]): string {
  if (codes.length === 0) return '—';
  return codes.map((code) => USER_IMPORT_ERROR_LABELS[code] ?? code).join(', ');
}

/** Spanish labels for staging row status badges. */
export const USER_IMPORT_STATUS_LABELS: Record<string, string> = {
  valid: 'Válido',
  error: 'Error',
  duplicate: 'Duplicado',
  created: 'Creado',
  pending: 'Pendiente',
  skipped: 'Omitido',
};

/** Spanish labels for import job status. */
export const USER_IMPORT_JOB_STATUS_LABELS: Record<string, string> = {
  pending_parse: 'Procesando',
  ready: 'Listo',
  committing: 'Creando usuarios',
  committed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
};
