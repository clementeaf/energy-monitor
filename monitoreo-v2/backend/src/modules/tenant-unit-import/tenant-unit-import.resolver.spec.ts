import {
  detectDuplicateUnitCode,
  resolveBuildingRef,
} from './tenant-unit-import.resolver';

const buildings = [
  { id: 'b-1', code: 'MM446', externalSiteId: 'PASA-446' },
  { id: 'b-2', code: 'MM100', externalSiteId: null },
];

describe('tenant-unit-import.resolver', () => {
  it('resolves building by code or external site id', () => {
    expect(resolveBuildingRef('MM446', null, buildings)).toEqual({ buildingId: 'b-1', error: null });
    expect(resolveBuildingRef(null, 'PASA-446', buildings)).toEqual({ buildingId: 'b-1', error: null });
    expect(resolveBuildingRef('UNKNOWN', null, buildings)).toEqual({
      buildingId: null,
      error: 'BUILDING_NOT_FOUND',
    });
  });

  it('flags mismatch when code and external id point to different buildings', () => {
    expect(resolveBuildingRef('MM100', 'PASA-446', buildings)).toEqual({
      buildingId: null,
      error: 'BUILDING_REF_MISMATCH',
    });
  });

  it('detects duplicate unit code per building', () => {
    const existing = new Set(['b-1|l124']);
    const seen = new Set<string>();
    expect(detectDuplicateUnitCode('b-1', 'L124', existing, seen)).toBe('DUPLICATE_UNIT_CODE');
    seen.add('b-1|l124');
    expect(detectDuplicateUnitCode('b-1', 'L124', new Set(), seen)).toBe('DUPLICATE_UNIT_CODE_IN_FILE');
  });
});
