import { Test } from '@nestjs/testing';
import { BaselineController } from './baseline.controller';
import { BaselineService } from './baseline.service';

const mockUser = { tenantId: 't-1', buildingIds: ['bld-1'], sub: 'u-1', role: 'admin' };

describe('BaselineController', () => {
  let controller: BaselineController;
  let service: {
    getHourlyBaseline: jest.Mock;
    getDailyBaseline: jest.Mock;
    getBaselineSummary: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getHourlyBaseline: jest.fn(),
      getDailyBaseline: jest.fn(),
      getBaselineSummary: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [BaselineController],
      providers: [{ provide: BaselineService, useValue: service }],
    }).compile();

    controller = module.get(BaselineController);
  });

  it('GET /baseline/hourly delegates to service', async () => {
    const mockResult = [{ hour: '2026-01-15 10:00', actualKwh: 120, baselineKwh: 100, deviationPct: 20 }];
    service.getHourlyBaseline.mockResolvedValue(mockResult);

    const result = await controller.getHourly(mockUser as any, {
      from: '2026-01-15',
      to: '2026-01-16',
      buildingId: 'bld-1',
    });

    expect(result).toEqual(mockResult);
  });

  it('GET /baseline/daily delegates to service', async () => {
    service.getDailyBaseline.mockResolvedValue([]);

    await controller.getDaily(mockUser as any, {
      from: '2026-01-15',
      to: '2026-01-22',
      buildingId: 'bld-1',
    });

    expect(service.getDailyBaseline).toHaveBeenCalledWith(
      't-1', ['bld-1'], { from: '2026-01-15', to: '2026-01-22', buildingId: 'bld-1' },
    );
  });

  it('GET /baseline/summary delegates to service', async () => {
    service.getBaselineSummary.mockResolvedValue({
      totalActualKwh: 15000,
      totalBaselineKwh: 14000,
      deviationPct: 7.14,
      daysCount: 7,
    });

    const result = await controller.getSummary(mockUser as any, {
      from: '2026-01-15',
      to: '2026-01-22',
      buildingId: 'bld-1',
    });

    expect(result.deviationPct).toBeCloseTo(7.14);
  });
});
