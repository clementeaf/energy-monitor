/** Canonical import column keys (plantilla v1). */
export type UserImportCanonicalColumn =
  | 'email'
  | 'auth_provider'
  | 'role_slug'
  | 'display_name'
  | 'building_codes'
  | 'phone';

const REQUIRED_COLUMNS: UserImportCanonicalColumn[] = ['email', 'auth_provider', 'role_slug'];

const COLUMN_ALIASES: Record<UserImportCanonicalColumn, readonly string[]> = {
  email: ['email', 'correo', 'mail', 'e-mail', 'e_mail'],
  auth_provider: ['auth_provider', 'proveedor', 'provider', 'oauth_provider', 'auth'],
  role_slug: ['role_slug', 'rol', 'role', 'perfil', 'cargo'],
  display_name: ['display_name', 'nombre', 'name', 'displayname'],
  building_codes: ['building_codes', 'edificios', 'buildings', 'malls', 'centros', 'sites'],
  phone: ['phone', 'telefono', 'tel', 'mobile', 'celular'],
};

/**
 * Normalizes a spreadsheet header to a canonical column key.
 * @param header - Raw header cell
 * @returns Canonical key or null if unknown
 */
export function mapHeaderToCanonical(header: string): UserImportCanonicalColumn | null {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, '_');
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES) as [UserImportCanonicalColumn, readonly string[]][]) {
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
export function buildHeaderIndex(headers: string[]): Map<UserImportCanonicalColumn, number> {
  const index = new Map<UserImportCanonicalColumn, number>();
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
  headerIndex: Map<UserImportCanonicalColumn, number>,
): UserImportCanonicalColumn[] {
  return REQUIRED_COLUMNS.filter((col) => !headerIndex.has(col));
}

export { REQUIRED_COLUMNS, COLUMN_ALIASES };
