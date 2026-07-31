import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CarbonFootprintController } from './carbon-footprint.controller';
import { CarbonFootprintService } from './carbon-footprint.service';

const TENANT_ID = 'tenant-1';
const BUILDING_IDS = ['bld-1'];

const mockUser = { tenantId: TENANT_ID, buildingIds: BUILDING_IDS, sub: 'u-1', role: 'admin' };

describe('CarbonFootprintController', () => {
  let controller: CarbonFootprintController;
  let service: { getByBuilding: jest.Mock; getTenantSummary: jest.Mock; getMonthlyBreakdown: jest.Mock };

  beforeEach(async () => {
    service = {
      getByBuilding: jest.fn(),
      getTenantSummary: jest.fn(),
      getMonthlyBreakdown: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [CarbonFootprintController],
      providers: [{ provide: CarbonFootprintService, useValue: service }],
    }).compile();

    controller = module.get(CarbonFootprintController);
  });

  describe('GET /carbon-footprint/by-building', () => {
    it('returns emissions per building', async () => {
      const mockResult = [
        { buildingId: 'bld-1', buildingName: 'Mall Norte', totalKwh: 50000, tonsCo2e: 19.335 },
      ];
      service.getByBuilding.mockResolvedValue(mockResult);

      const result = await controller.getByBuilding(mockUser as any, {
        from: '2026-01-01',
        to: '2026-06-30',
      });

      expect(result).toEqual(mockResult);
      expect(service.getByBuilding).toHaveBeenCalledWith(
        TENANT_ID, BUILDING_IDS, { from: '2026-01-01', to: '2026-06-30' },
      );
    });
  });

  describe('GET /carbon-footprint/summary', () => {
    it('returns tenant summary', async () => {
      const mockResult = { totalKwh: 80000, tonsCo2e: 30.936, factorUsed: 0.3867 };
      service.getTenantSummary.mockResolvedValue(mockResult);

      const result = await controller.getSummary(mockUser as any, {
        from: '2026-01-01',
        to: '2026-06-30',
      });

      expect(result).toEqual(mockResult);
    });
  });

  describe('GET /carbon-footprint/monthly', () => {
    it('returns monthly breakdown', async () => {
      const mockResult = [
        { month: '2026-01', totalKwh: 10000, tonsCo2e: 3.867 },
      ];
      service.getMonthlyBreakdown.mockResolvedValue(mockResult);

      const result = await controller.getMonthly(mockUser as any, {
        from: '2026-01-01',
        to: '2026-03-31',
        buildingId: 'bld-1',
      });

      expect(result).toEqual(mockResult);
    });
  });
});
