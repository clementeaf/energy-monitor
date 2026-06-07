import {
  detectDuplicateCode,
  detectDuplicateExternalSiteId,
  resolveRegionCode,
} from './building-import.resolver';

describe('building-import.resolver', () => {
  it('detects duplicate code in file and DB', () => {
    const existing = new Set(['mm446']);
    const seen = new Set<string>();
    expect(detectDuplicateCode('MM446', existing, seen)).toBe('DUPLICATE_CODE');
    seen.add('mm446');
    expect(detectDuplicateCode('MM446', new Set(), seen)).toBe('DUPLICATE_CODE_IN_FILE');
  });

  it('detects duplicate external site id', () => {
    const existing = new Set(['pasa-1']);
    const seen = new Set<string>();
    expect(detectDuplicateExternalSiteId('PASA-1', existing, seen)).toBe('DUPLICATE_EXTERNAL_SITE_ID');
  });

  it('resolves region code case-insensitively', () => {
    const regions = new Map([
      ['rm', { id: 'r-1', code: 'RM', name: 'Metropolitana' }],
    ]);
    expect(resolveRegionCode('rm', regions)).toEqual({ regionId: 'r-1', error: null });
    expect(resolveRegionCode('XV', regions)).toEqual({ regionId: null, error: 'REGION_NOT_FOUND' });
  });
});
