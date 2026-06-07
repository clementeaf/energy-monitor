/** Canonical import column keys (plantilla v1). */
export type BuildingImportCanonicalColumn =
  | 'name'
  | 'code'
  | 'address'
  | 'area_sqm'
  | 'region_code'
  | 'country_code'
  | 'timezone'
  | 'external_site_id'
  | 'site_kind';

const REQUIRED_COLUMNS: BuildingImportCanonicalColumn[] = ['name', 'code'];

const COLUMN_ALIASES: Record<BuildingImportCanonicalColumn, readonly string[]> = {
  name: ['name', 'nombre', 'building_name', 'edificio'],
  code: ['code', 'codigo', 'building_code', 'site_code', 'centro'],
  address: ['address', 'direccion', 'dirección'],
  area_sqm: ['area_sqm', 'area', 'superficie', 'm2', 'metros_cuadrados'],
  region_code: ['region_code', 'region', 'codigo_region', 'codigo_región'],
  country_code: ['country_code', 'country', 'pais', 'país', 'codigo_pais'],
  timezone: ['timezone', 'zona_horaria', 'tz'],
  external_site_id: ['external_site_id', 'site_id', 'id_externo', 'external_id'],
  site_kind: ['site_kind', 'tipo', 'tipo_sitio', 'kind'],
};

/**
 * Normalizes a spreadsheet header to a canonical column key.
 * @param header - Raw header cell
 * @returns Canonical key or null if unknown
 */
export function mapHeaderToCanonical(header: string): BuildingImportCanonicalColumn | null {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, '_');
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES) as [BuildingImportCanonicalColumn, readonly string[]][]) {
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
export function buildHeaderIndex(headers: string[]): Map<BuildingImportCanonicalColumn, number> {
  const index = new Map<BuildingImportCanonicalColumn, number>();
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
  headerIndex: Map<BuildingImportCanonicalColumn, number>,
): BuildingImportCanonicalColumn[] {
  return REQUIRED_COLUMNS.filter((col) => !headerIndex.has(col));
}
