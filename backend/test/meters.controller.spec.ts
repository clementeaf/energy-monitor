import { NotFoundException } from '@nestjs/common';
import { MetersController } from '../src/meters/meters.controller';
import type { MetersService } from '../src/meters/meters.service';

describe('MetersController', () => {
  const metersService = {
    getOverview: jest.fn(),
    findOne: jest.fn(),
    getUptimeAll: jest.fn(),
    getUptimeSummary: jest.fn(),
    getDowntimeEvents: jest.fn(),
    getAlarmEvents: jest.fn(),
    getAlarmSummary: jest.fn(),
    findReadings: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<MetersService, 'getOverview' | 'findOne' | 'getUptimeAll' | 'getUptimeSummary' | 'getDowntimeEvents' | 'getAlarmEvents' | 'getAlarmSummary' | 'findReadings'>
  >;

  const controller = new MetersController(metersService as unknown as MetersService);

  beforeEach(() => {
    Object.values(metersService).forEach((fn) => fn.mockReset());
  });

  it('returns overview', async () => {
    const result: Awaited<ReturnType<MetersService['getOverview']>> = [{
      id: 'M001',
      buildingId: 'pac4220',
      model: 'PAC1670',
      phaseType: '3P',
      busId: 'BUS-01',
      status: 'online',
      lastReadingAt: '2026-03-09T00:00:00Z',
      uptime24h: 99.9,
      alarmCount30d: 1,
    }];
    metersService.getOverview.mockResolvedValue(result);

    await expect(controller.getOverview()).resolves.toEqual(result);
  });

  it('throws NotFoundException when meter is missing', async () => {
    metersService.findOne.mockResolvedValue(null);

    await expect(controller.findOne('M999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses getUptimeAll when period is all or omitted', async () => {
    const result: Awaited<ReturnType<MetersService['getUptimeAll']>> = {
      daily: {
        period: 'daily',
        totalSeconds: 86400,
        uptimeSeconds: 86000,
        downtimeSeconds: 400,
        uptimePercent: 99.54,
        downtimeEvents: 1,
      },
      weekly: {
        period: 'weekly',
        totalSeconds: 604800,
        uptimeSeconds: 604000,
        downtimeSeconds: 800,
        uptimePercent: 99.87,
        downtimeEvents: 2,
      },
      monthly: {
        period: 'monthly',
        totalSeconds: 2592000,
        uptimeSeconds: 2580000,
        downtimeSeconds: 12000,
        uptimePercent: 99.54,
        downtimeEvents: 4,
      },
    };
    metersService.getUptimeAll.mockResolvedValue(result);

    await expect(controller.getUptime('M001')).resolves.toEqual(result);
    expect(metersService.getUptimeAll).toHaveBeenCalledWith('M001');
  });

  it('passes reading resolution and range to service', async () => {
    const result: Awaited<ReturnType<MetersService['findReadings']>> = [{
      timestamp: '2026-03-09T00:00:00Z',
      voltageL1: null,
      voltageL2: null,
      voltageL3: null,
      currentL1: null,
      currentL2: null,
      currentL3: null,
      powerKw: 4,
      reactivePowerKvar: null,
      powerFactor: null,
      frequencyHz: null,
      energyKwhTotal: 10,
      thdVoltagePct: null,
      thdCurrentPct: null,
      phaseImbalancePct: null,
    }];
    metersService.findReadings.mockResolvedValue(result);

    await expect(
      controller.findReadings('M001', 'raw', '2026-03-09T00:00:00Z', '2026-03-09T01:00:00Z'),
    ).resolves.toEqual(result);
    expect(metersService.findReadings).toHaveBeenCalledWith(
      'M001',
      'raw',
      '2026-03-09T00:00:00Z',
      '2026-03-09T01:00:00Z',
    );
  });
});