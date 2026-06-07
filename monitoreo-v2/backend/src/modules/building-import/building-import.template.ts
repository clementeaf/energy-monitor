/**
 * Returns CSV template bytes for building bulk import.
 * @returns UTF-8 CSV buffer with header and example row
 */
export function buildBuildingImportTemplateCsv(): Buffer {
  const lines = [
    'name,code,address,area_sqm,region_code,country_code,timezone,external_site_id,site_kind',
    'Mall Plaza Norte,MM446,Av. Américo Vespucio 1737,45000,RM,CL,America/Santiago,PASA-446,mall',
  ];
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}
