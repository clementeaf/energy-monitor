import { NotFoundException } from '@nestjs/common';
import { BuildingsController } from '../src/buildings/buildings.controller';
import type { AuthorizationContext } from '../src/auth/auth.service';
import type { BuildingsService } from '../src/buildings/buildings.service';

const authContext: AuthorizationContext = {
  userId: 'user-1',
  roleId: 4,
  role: 'OPERATOR',
  provider: 'google',
  email: 'operator@example.com',
  name: 'Operador',
  permissions: { BUILDINGS_OVERVIEW: ['view'], BUILDING_DETAIL: ['view'] },
  siteIds: ['pac4220'],
  hasGlobalSiteAccess: false,
};

describe('BuildingsController', () => {
  const buildingsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findMeters: jest.fn(),
    findConsumption: jest.fn(),
  } as unknown as jest.Mocked<Pick<BuildingsService, 'findAll' | 'findOne' | 'findMeters' | 'findConsumption'>>;

  const controller = new BuildingsController(buildingsService as unknown as BuildingsService);

  beforeEach(() => {
    buildingsService.findAll.mockReset();
    buildingsService.findOne.mockReset();
    buildingsService.findMeters.mockReset();
    buildingsService.findConsumption.mockReset();
  });

  it('returns building list', async () => {
    const result: Awaited<ReturnType<BuildingsService['findAll']>> = [{
      id: 'pac4220',
      name: 'PAC 4220',
      address: 'Av. Principal 4220',
      totalArea: 1200,
      metersCount: 15,
    }];
    buildingsService.findAll.mockResolvedValue(result);

    await expect(controller.findAll(authContext)).resolves.toEqual(result);
  });

  it('throws NotFoundException when building does not exist', async () => {
    buildingsService.findOne.mockResolvedValue(null);

    await expect(controller.findOne('missing', authContext)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('passes consumption query params to service', async () => {
    const result: Awaited<ReturnType<BuildingsService['findConsumption']>> = [{
      timestamp: '2026-03-09T00:00:00Z',
      totalPowerKw: 10,
      avgPowerKw: 5,
      peakPowerKw: 12,
    }];
    buildingsService.findConsumption.mockResolvedValue(result);

    await expect(
      controller.findConsumption('pac4220', authContext, '15min', '2026-03-09T00:00:00Z', '2026-03-09T23:59:59Z'),
    ).resolves.toEqual(result);
    expect(buildingsService.findConsumption).toHaveBeenCalledWith(
      'pac4220',
      authContext,
      '15min',
      '2026-03-09T00:00:00Z',
      '2026-03-09T23:59:59Z',
    );
  });
});