import { NotFoundException } from '@nestjs/common';
import { HierarchyController } from '../src/hierarchy/hierarchy.controller';
import type { AuthorizationContext } from '../src/auth/auth.service';
import type { HierarchyService } from '../src/hierarchy/hierarchy.service';

const authContext: AuthorizationContext = {
  userId: 'user-1',
  roleId: 4,
  role: 'OPERATOR',
  provider: 'google',
  email: 'operator@example.com',
  name: 'Operador',
  permissions: { MONITORING_DRILLDOWN: ['view'] },
  siteIds: ['pac4220'],
  hasGlobalSiteAccess: false,
};

describe('HierarchyController', () => {
  const hierarchyService = {
    findTree: jest.fn(),
    findNode: jest.fn(),
    findChildrenWithConsumption: jest.fn(),
    findNodeConsumption: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<HierarchyService, 'findTree' | 'findNode' | 'findChildrenWithConsumption' | 'findNodeConsumption'>
  >;

  const controller = new HierarchyController(hierarchyService as unknown as HierarchyService);

  beforeEach(() => {
    Object.values(hierarchyService).forEach((fn) => fn.mockReset());
  });

  it('returns hierarchy tree for building', async () => {
    const result: Awaited<ReturnType<HierarchyService['findTree']>> = [{
      id: 'B-PAC4220',
      parentId: null,
      buildingId: 'pac4220',
      name: 'PAC 4220',
      level: 1,
      nodeType: 'building',
      meterId: null,
      sortOrder: 0,
      parent: null,
      meter: null,
    }];
    hierarchyService.findTree.mockResolvedValue(result);

    await expect(controller.findTree('pac4220', authContext)).resolves.toEqual(result);
  });

  it('throws NotFoundException when node is missing', async () => {
    hierarchyService.findNode.mockResolvedValue(null);

    await expect(controller.findNode('missing', authContext)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('passes filters to children query', async () => {
    const result: Awaited<ReturnType<HierarchyService['findChildrenWithConsumption']>> = [{
      id: 'NODE-1',
      parentId: 'B-PAC4220',
      buildingId: 'pac4220',
      name: 'Tablero General',
      level: 2,
      nodeType: 'panel',
      meterId: null,
      sortOrder: 1,
      totalKwh: 100,
      avgPowerKw: 10,
      peakPowerKw: 12,
      meterCount: 3,
      status: 'online',
      parent: null,
      meter: null,
    }];
    hierarchyService.findChildrenWithConsumption.mockResolvedValue(result);

    await expect(
      controller.findChildren('NODE-1', authContext, '2026-03-09T00:00:00Z', '2026-03-09T23:59:59Z'),
    ).resolves.toEqual(result);
    expect(hierarchyService.findChildrenWithConsumption).toHaveBeenCalledWith(
      'NODE-1',
      authContext,
      '2026-03-09T00:00:00Z',
      '2026-03-09T23:59:59Z',
    );
  });
});