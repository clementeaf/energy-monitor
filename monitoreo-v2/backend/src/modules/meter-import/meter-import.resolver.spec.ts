import {
  detectDuplicateCode,
  detectDuplicateExternalId,
  resolveBuildingRef,
  resolveHierarchyNode,
  resolveParentMeter,
} from './meter-import.resolver';
import type { MeterImportHierarchyRef, MeterImportMeterRef } from './meter-import.types';

describe('meter-import.resolver', () => {
  const buildings = [
    { id: 'b-1', code: 'MM446', externalSiteId: 'PASA-446' },
  ];

  it('resolves building by code or external site id', () => {
    expect(resolveBuildingRef('MM446', null, buildings)).toEqual({ buildingId: 'b-1', error: null });
    expect(resolveBuildingRef(null, 'PASA-446', buildings)).toEqual({ buildingId: 'b-1', error: null });
    expect(resolveBuildingRef('XX', null, buildings)).toEqual({ buildingId: null, error: 'BUILDING_NOT_FOUND' });
  });

  it('detects duplicate meter code in file and DB', () => {
    const existing = new Set(['mg-001']);
    const seen = new Set<string>();
    expect(detectDuplicateCode('MG-001', existing, seen)).toBe('DUPLICATE_CODE');
    seen.add('mg-001');
    expect(detectDuplicateCode('MG-001', new Set(), seen)).toBe('DUPLICATE_CODE_IN_FILE');
  });

  it('detects duplicate external id', () => {
    const existing = new Set(['ext-1']);
    const seen = new Set<string>();
    expect(detectDuplicateExternalId('EXT-1', existing, seen)).toBe('DUPLICATE_EXTERNAL_ID');
  });

  it('resolves parent meter from DB or pending in file', () => {
    const meters = new Map<string, MeterImportMeterRef>([
      ['b-1|mg-parent', { id: 'm-parent', code: 'MG-PARENT', buildingId: 'b-1' }],
    ]);
    const codesInFile = new Set(['mg-child']);

    expect(resolveParentMeter('MG-PARENT', 'MG-CHILD', 'b-1', meters, codesInFile)).toEqual({
      parentMeterId: 'm-parent',
      parentPendingInFile: false,
      error: null,
    });

    expect(resolveParentMeter('MG-CHILD', 'MG-PARENT', 'b-1', meters, new Set(['mg-parent', 'mg-child']))).toEqual({
      parentMeterId: null,
      parentPendingInFile: true,
      error: null,
    });

    expect(resolveParentMeter('MG-001', 'MG-001', 'b-1', meters, codesInFile)).toEqual({
      parentMeterId: null,
      parentPendingInFile: false,
      error: 'INVALID_PARENT_SELF',
    });
  });

  it('resolves hierarchy node by building and name', () => {
    const hierarchy = new Map<string, MeterImportHierarchyRef[]>([
      ['b-1|panel principal', [{ id: 'h-1', buildingId: 'b-1', name: 'Panel Principal' }]],
      ['b-1|duplicado', [
        { id: 'h-2', buildingId: 'b-1', name: 'Duplicado' },
        { id: 'h-3', buildingId: 'b-1', name: 'Duplicado' },
      ]],
    ]);

    expect(resolveHierarchyNode('Panel Principal', 'b-1', hierarchy)).toEqual({
      hierarchyNodeId: 'h-1',
      error: null,
    });
    expect(resolveHierarchyNode('Missing', 'b-1', hierarchy)).toEqual({
      hierarchyNodeId: null,
      error: 'HIERARCHY_NODE_NOT_FOUND',
    });
    expect(resolveHierarchyNode('Duplicado', 'b-1', hierarchy)).toEqual({
      hierarchyNodeId: null,
      error: 'HIERARCHY_NODE_AMBIGUOUS',
    });
  });
});
