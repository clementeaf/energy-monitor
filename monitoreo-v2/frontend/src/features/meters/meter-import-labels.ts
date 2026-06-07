/** Spanish labels for meter import validation error codes. */
const METER_IMPORT_ERROR_LABELS: Record<string, string> = {
  MISSING_NAME: 'Nombre obligatorio',
  MISSING_CODE: 'Código obligatorio',
  MISSING_BUILDING_REF: 'Falta referencia de edificio (building_code o external_site_id)',
  BUILDING_NOT_FOUND: 'Edificio no encontrado',
  BUILDING_REF_MISMATCH: 'Código y site ID apuntan a edificios distintos',
  INVALID_PHASE_TYPE: 'Tipo de fase inválido',
  INVALID_LOAD_CATEGORY: 'Categoría de carga inválida',
  INVALID_MODBUS_ADDRESS: 'Dirección Modbus inválida',
  INVALID_IS_ACTIVE: 'Valor activo/inactivo inválido',
  PARENT_METER_NOT_FOUND: 'Medidor padre no encontrado',
  PARENT_METER_CROSS_BUILDING: 'Medidor padre en otro edificio',
  INVALID_PARENT_SELF: 'El medidor no puede ser su propio padre',
  HIERARCHY_NODE_NOT_FOUND: 'Nodo de jerarquía no encontrado',
  HIERARCHY_NODE_AMBIGUOUS: 'Nombre de nodo ambiguo en el edificio',
  DUPLICATE_CODE: 'Código ya registrado',
  DUPLICATE_CODE_IN_FILE: 'Código duplicado en el archivo',
  DUPLICATE_EXTERNAL_ID: 'ID externo ya registrado',
  DUPLICATE_EXTERNAL_ID_IN_FILE: 'ID externo duplicado en el archivo',
  COMMIT_FAILED: 'Error al crear medidor',
};

/**
 * Returns human-readable Spanish labels for import error codes.
 * @param codes - Backend error code strings
 * @returns Comma-separated labels
 */
export function formatMeterImportErrorCodes(codes: string[]): string {
  if (codes.length === 0) return '—';
  return codes.map((code) => METER_IMPORT_ERROR_LABELS[code] ?? code).join(', ');
}

export {
  USER_IMPORT_STATUS_LABELS as METER_IMPORT_STATUS_LABELS,
  USER_IMPORT_JOB_STATUS_LABELS as METER_IMPORT_JOB_STATUS_LABELS,
} from '../admin/users/user-import-labels';
