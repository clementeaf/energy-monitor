/**
 * Returns CSV template bytes for tenant unit bulk import.
 * @returns UTF-8 CSV buffer with header and example row
 */
export function buildTenantUnitImportTemplateCsv(): Buffer {
  const lines = [
    'name,unit_code,building_code,external_site_id,contact_name,contact_email,external_unit_id',
    'Tienda Falabella L124,L124,MM446,,María López,maria@locatario.cl,EXT-L124',
  ];
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}
