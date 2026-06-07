/** Canonical import column keys (plantilla v1). */
export type TenantUnitImportCanonicalColumn =
  | 'name'
  | 'unit_code'
  | 'building_code'
  | 'external_site_id'
  | 'contact_name'
  | 'contact_email'
  | 'external_unit_id';

const REQUIRED_COLUMNS: TenantUnitImportCanonicalColumn[] = ['name', 'unit_code'];

const COLUMN_ALIASES: Record<TenantUnitImportCanonicalColumn, readonly string[]> = {
  name: ['name', 'nombre', 'locatario', 'tenant_name'],
  unit_code: ['unit_code', 'codigo', 'codigo_unidad', 'codigo_tienda', 'store_code'],
  building_code: ['building_code', 'codigo_edificio', 'centro', 'mall_code', 'site_code'],
  external_site_id: ['external_site_id', 'site_id', 'id_externo_edificio', 'building_external_id'],
  contact_name: ['contact_name', 'contacto', 'nombre_contacto'],
  contact_email: ['contact_email', 'email', 'correo', 'mail'],
  external_unit_id: ['external_unit_id', 'id_externo', 'external_id', 'unit_external_id'],
};

/**
 * Normalizes a spreadsheet header to a canonical column key.
 * @param header - Raw header cell
 * @returns Canonical key or null if unknown
 */
export function mapHeaderToCanonical(header: string): TenantUnitImportCanonicalColumn | null {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, '_');
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES) as [TenantUnitImportCanonicalColumn, readonly string[]][]) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }
  return null;
}

/**
 * Maps raw header row to canonical keys (first match wins per canonical).
 * @param headers - Raw header strings
 * @returns Map canonical → source header index
 */
export function buildHeaderIndex(headers: string[]): Map<TenantUnitImportCanonicalColumn, number> {
  const index = new Map<TenantUnitImportCanonicalColumn, number>();
  headers.forEach((header, i) => {
    const canonical = mapHeaderToCanonical(header);
    if (canonical && !index.has(canonical)) {
      index.set(canonical, i);
    }
  });
  return index;
}

/**
 * Returns required canonical columns missing from the header row.
 * @param headerIndex - Mapped headers
 * @returns Missing required column names
 */
export function missingRequiredColumns(
  headerIndex: Map<TenantUnitImportCanonicalColumn, number>,
): TenantUnitImportCanonicalColumn[] {
  return REQUIRED_COLUMNS.filter((col) => !headerIndex.has(col));
}

/**
 * Returns true when at least one building reference column is mapped.
 * @param headerIndex - Mapped headers
 * @returns Whether building reference exists
 */
export function hasBuildingReferenceColumn(
  headerIndex: Map<TenantUnitImportCanonicalColumn, number>,
): boolean {
  return headerIndex.has('building_code') || headerIndex.has('external_site_id');
}
