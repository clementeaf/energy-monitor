import {
  buildHeaderIndex,
  mapHeaderToCanonical,
  missingRequiredColumns,
} from './building-import-column-map';

describe('building-import-column-map', () => {
  it('maps Spanish aliases to canonical keys', () => {
    expect(mapHeaderToCanonical('Nombre')).toBe('name');
    expect(mapHeaderToCanonical('codigo')).toBe('code');
    expect(mapHeaderToCanonical('codigo_region')).toBe('region_code');
  });

  it('detects missing required columns', () => {
    const index = buildHeaderIndex(['name']);
    expect(missingRequiredColumns(index)).toEqual(['code']);
  });
});
