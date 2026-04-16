import { Test } from '@nestjs/testing';
import { IotReadingsController } from './iot-readings.controller';
import { IotReadingsService } from './iot-readings.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'operator',
  permissions: ['readings:read', 'alerts:read'],
  buildingIds: ['b-1'],
};

describe('IotReadingsController', () => {
  let controller: IotReadingsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      getLatest: jest.fn().mockResolvedValue([]),
      getTimeSeries: jest.fn().mockResolvedValue([]),
      getReadings: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      getAlerts: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue(null),
    };

    const module = await Test.createTestingModule({
      controllers: [IotReadingsController],
      providers: [{ provide: IotReadingsService, useValue: service }],
    }).compile();

    controller = module.get(IotReadingsController);
  });

  it('getLatest delegates with tenant + buildingIds', async () => {
    await controller.getLatest(user, {});
    expect(service.getLatest).toHaveBeenCalledWith('t-1', ['b-1'], undefined);
  });

  it('getLatest passes meterId filter', async () => {
    await controller.getLatest(user, { meterId: 'm-1' });
    expect(service.getLatest).toHaveBeenCalledWith('t-1', ['b-1'], 'm-1');
  });

  it('getTimeSeries splits variables csv', async () => {
    await controller.getTimeSeries(user, {
      meterId: 'm-1',
      from: '2026-01-01',
      to: '2026-01-02',
      variables: 'voltage_l1,power_factor',
      resolution: 'hour',
    });
    expect(service.getTimeSeries).toHaveBeenCalledWith(
      't-1', ['b-1'], 'm-1', '2026-01-01', '2026-01-02',
      ['voltage_l1', 'power_factor'], 'hour',
    );
  });

  it('getTimeSeries defaults to raw resolution', async () => {
    await controller.getTimeSeries(user, {
      meterId: 'm-1', from: '2026-01-01', to: '2026-01-02',
    });
    expect(service.getTimeSeries).toHaveBeenCalledWith(
      't-1', ['b-1'], 'm-1', '2026-01-01', '2026-01-02', [], 'raw',
    );
  });

  it('getReadings delegates with default limit', async () => {
    await controller.getReadings(user, {
      meterId: 'm-1', from: '2026-01-01', to: '2026-01-02',
    });
    expect(service.getReadings).toHaveBeenCalledWith('t-1', ['b-1'], 'm-1', '2026-01-01', '2026-01-02', 100);
  });

  it('getReadings uses provided limit', async () => {
    await controller.getReadings(user, {
      meterId: 'm-1', from: '2026-01-01', to: '2026-01-02', limit: 50,
    });
    expect(service.getReadings).toHaveBeenCalledWith('t-1', ['b-1'], 'm-1', '2026-01-01', '2026-01-02', 50);
  });

  it('getAlerts delegates with filters', async () => {
    await controller.getAlerts(user, { severity: 'HIGH', meterId: 'm-1' });
    expect(service.getAlerts).toHaveBeenCalledWith('t-1', ['b-1'], {
      severity: 'HIGH', meterId: 'm-1',
    });
  });

  it('getStats delegates to service', async () => {
    await controller.getStats(user, {
      meterId: 'm-1', from: '2026-01-01', to: '2026-01-02',
    });
    expect(service.getStats).toHaveBeenCalledWith('t-1', ['b-1'], 'm-1', '2026-01-01', '2026-01-02');
  });
});
