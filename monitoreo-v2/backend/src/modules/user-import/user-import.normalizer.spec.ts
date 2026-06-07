import {
  normalizeAuthProvider,
  normalizeEmail,
  splitBuildingCodes,
  parseTabularImportRows,
} from './user-import.normalizer';

describe('user-import.normalizer', () => {
  it('normalizes provider aliases including Spanish-friendly values', () => {
    expect(normalizeAuthProvider('Microsoft')).toBe('microsoft');
    expect(normalizeAuthProvider('ms')).toBe('microsoft');
    expect(normalizeAuthProvider('azure')).toBe('microsoft');
    expect(normalizeAuthProvider('google')).toBe('google');
    expect(normalizeAuthProvider('gmail')).toBe('google');
    expect(normalizeAuthProvider('invalid')).toBeNull();
  });

  it('normalizes email to lowercase trimmed', () => {
    expect(normalizeEmail('  User@Empresa.CL ')).toBe('user@empresa.cl');
    expect(normalizeEmail('')).toBeNull();
  });

  it('splits building codes on comma semicolon and pipe', () => {
    expect(splitBuildingCodes('MM446,MG254')).toEqual(['MM446', 'MG254']);
    expect(splitBuildingCodes('MM446;MG254')).toEqual(['MM446', 'MG254']);
    expect(splitBuildingCodes('MM446|MG254')).toEqual(['MM446', 'MG254']);
    expect(splitBuildingCodes('')).toEqual([]);
  });

  it('maps Spanish headers to canonical row cells', () => {
    const headers = ['Correo', 'Proveedor', 'Rol', 'Nombre', 'Edificios'];
    const rows = [['a@b.cl', 'microsoft', 'operator', 'Ana', 'MM446']];
    const parsed = parseTabularImportRows(headers, rows);
    expect(parsed[0].cells.email).toBe('a@b.cl');
    expect(parsed[0].cells.auth_provider).toBe('microsoft');
    expect(parsed[0].cells.role_slug).toBe('operator');
    expect(parsed[0].cells.display_name).toBe('Ana');
    expect(parsed[0].cells.building_codes).toBe('MM446');
  });
});
