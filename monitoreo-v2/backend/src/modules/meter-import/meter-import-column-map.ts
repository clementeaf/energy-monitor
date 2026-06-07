/** Canonical import column keys (plantilla v1). */
export type MeterImportCanonicalColumn =
  | 'name'
  | 'code'
  | 'building_code'
  | 'external_site_id'
  | 'meter_type'
  | 'model'
  | 'serial_number'
  | 'phase_type'
  | 'load_category'
  | 'parent_meter_code'
  | 'hierarchy_node_name'
  | 'modbus_address'
  | 'bus_id'
  | 'uplink_route'
  | 'external_id'
  | 'is_active';

const REQUIRED_COLUMNS: MeterImportCanonicalColumn[] = ['name', 'code'];

const COLUMN_ALIASES: Record<MeterImportCanonicalColumn, readonly string[]> = {
  name: ['name', 'nombre', 'meter_name', 'medidor'],
  code: ['code', 'codigo', 'meter_code', 'codigo_medidor', 'id_medidor'],
  building_code: ['building_code', 'codigo_edificio', 'centro', 'mall_code', 'site_code'],
  external_site_id: ['external_site_id', 'site_id', 'id_externo_edificio', 'building_external_id'],
  meter_type: ['meter_type', 'tipo', 'tipo_medidor'],
  model: ['model', 'modelo'],
  serial_number: ['serial_number', 'serial', 'numero_serie', 'nro_serie'],
  phase_type: ['phase_type', 'fase', 'tipo_fase', 'phase'],
  load_category: ['load_category', 'categoria_carga', 'carga', 'load'],
  parent_meter_code: ['parent_meter_code', 'parent_code', 'medidor_padre', 'codigo_padre'],
  hierarchy_node_name: ['hierarchy_node_name', 'nodo_jerarquia', 'jerarquia', 'hierarchy_node', 'nodo'],
  modbus_address: ['modbus_address', 'direccion_modbus', 'modbus'],
  bus_id: ['bus_id', 'bus'],
  uplink_route: ['uplink_route', 'ruta_uplink', 'uplink'],
  external_id: ['external_id', 'id_externo', 'external_meter_id'],
  is_active: ['is_active', 'activo', 'estado'],
};

/**
 * Normalizes a spreadsheet header to a canonical column key.
 * @param header - Raw header cell
 * @returns Canonical key or null if unknown
 */
export function mapHeaderToCanonical(header: string): MeterImportCanonicalColumn | null {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, '_');
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES) as [MeterImportCanonicalColumn, readonly string[]][]) {
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
export function buildHeaderIndex(headers: string[]): Map<MeterImportCanonicalColumn, number> {
  const index = new Map<MeterImportCanonicalColumn, number>();
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
  headerIndex: Map<MeterImportCanonicalColumn, number>,
): MeterImportCanonicalColumn[] {
  return REQUIRED_COLUMNS.filter((col) => !headerIndex.has(col));
}

/**
 * Returns true when at least one building reference column is mapped.
 * @param headerIndex - Mapped headers
 * @returns Whether building reference exists
 */
export function hasBuildingReferenceColumn(
  headerIndex: Map<MeterImportCanonicalColumn, number>,
): boolean {
  return headerIndex.has('building_code') || headerIndex.has('external_site_id');
}
