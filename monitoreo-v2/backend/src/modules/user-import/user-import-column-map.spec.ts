import { mapHeaderToCanonical, buildHeaderIndex, missingRequiredColumns } from './user-import-column-map';

describe('user-import-column-map', () => {
  it('maps Spanish and English header aliases', () => {
    expect(mapHeaderToCanonical('email')).toBe('email');
    expect(mapHeaderToCanonical('Correo')).toBe('email');
    expect(mapHeaderToCanonical('E-Mail')).toBe('email');
    expect(mapHeaderToCanonical('proveedor')).toBe('auth_provider');
    expect(mapHeaderToCanonical('Provider')).toBe('auth_provider');
    expect(mapHeaderToCanonical('rol')).toBe('role_slug');
    expect(mapHeaderToCanonical('Role')).toBe('role_slug');
    expect(mapHeaderToCanonical('nombre')).toBe('display_name');
    expect(mapHeaderToCanonical('edificios')).toBe('building_codes');
    expect(mapHeaderToCanonical('telefono')).toBe('phone');
    expect(mapHeaderToCanonical('unknown_col')).toBeNull();
  });

  it('builds header index with first alias match', () => {
    const index = buildHeaderIndex(['Correo', 'Proveedor', 'Rol', 'Nombre']);
    expect(index.get('email')).toBe(0);
    expect(index.get('auth_provider')).toBe(1);
    expect(index.get('role_slug')).toBe(2);
    expect(index.get('display_name')).toBe(3);
  });

  it('detects missing required columns', () => {
    const index = buildHeaderIndex(['email', 'nombre']);
    expect(missingRequiredColumns(index)).toEqual(['auth_provider', 'role_slug']);
  });
});
