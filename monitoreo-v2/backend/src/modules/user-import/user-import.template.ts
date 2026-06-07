/**
 * Returns CSV template bytes for user bulk import (IMP-031).
 * @returns UTF-8 CSV buffer with header and example row
 */
export function buildUserImportTemplateCsv(): Buffer {
  const lines = [
    'email,auth_provider,role_slug,display_name,building_codes,phone',
    'juan@empresa.cl,microsoft,operator,Juan Pérez,MM446,+56912345678',
  ];
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}
