import { Test } from '@nestjs/testing';
import { ExternalApiController } from './external-api.controller';
import { BuildingsService } from '../buildings/buildings.service';
import { MetersService } from '../meters/meters.service';
import { ReadingsService } from '../readings/readings.service';
import { AlertsService } from '../alerts/alerts.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'apikey:ak-1',
  email: 'apikey-emk_abcd@system',
  tenantId: 't-1',
  roleId: 'api_key',
  roleSlug: 'api_key',
  permissions: ['buildings:read', 'meters:read', 'readings:read', 'alerts:read'],
  buildingIds: ['b-1'],
};

describe('ExternalApiController', () => {
  let controller: ExternalApiController;
  let buildingsSvc: Record<string, jest.Mock>;
  let metersSvc: Record<string, jest.Mock>;
  let readingsSvc: Record<string, jest.Mock>;
  let alertsSvc: Record<string, jest.Mock>;

  beforeEach(async () => {
    buildingsSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    metersSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    readingsSvc = {
      findByMeter: jest.fn().mockResolvedValue([]),
      findLatest: jest.fn().mockResolvedValue([]),
      findAggregated: jest.fn().mockResolvedValue([]),
    };
    alertsSvc = { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [ExternalApiController],
      providers: [
        { provide: BuildingsService, useValue: buildingsSvc },
        { provide: MetersService, useValue: metersSvc },
        { provide: ReadingsService, useValue: readingsSvc },
        { provide: AlertsService, useValue: alertsSvc },
      ],
    }).compile();

    controller = module.get(ExternalApiController);
  });

  /* -- Buildings -- */

  it('listBuildings delegates with tenant + buildingIds', async () => {
    await controller.listBuildings(user);
    expect(buildingsSvc.findAll).toHaveBeenCalledWith('t-1', ['b-1']);
  });

  it('getBuilding delegates with id + tenant + buildingIds', async () => {
    buildingsSvc.findOne.mockResolvedValue({ id: 'b-1', name: 'Test' });
    const result = await controller.getBuilding('b-1', user);
    expect(buildingsSvc.findOne).toHaveBeenCalledWith('b-1', 't-1', ['b-1']);
    expect(result).toEqual({ id: 'b-1', name: 'Test' });
  });

  /* -- Meters -- */

  it('listMeters delegates with optional buildingId filter', async () => {
    await controller.listMeters(user, 'b-1');
    expect(metersSvc.findAll).toHaveBeenCalledWith('t-1', ['b-1'], 'b-1');
  });

  it('listMeters without buildingId filter', async () => {
    await controller.listMeters(user, undefined);
    expect(metersSvc.findAll).toHaveBeenCalledWith('t-1', ['b-1'], undefined);
  });

  it('getMeter delegates with id', async () => {
    metersSvc.findOne.mockResolvedValue({ id: 'm-1' });
    await controller.getMeter('m-1', user);
    expect(metersSvc.findOne).toHaveBeenCalledWith('m-1', 't-1', ['b-1']);
  });

  /* -- Readings -- */

  it('getReadings delegates to findByMeter', async () => {
    const query = { meterId: 'm-1', from: '2026-01-01', to: '2026-01-31' };
    await controller.getReadings(user, query as any);
    expect(readingsSvc.findByMeter).toHaveBeenCalledWith('t-1', ['b-1'], query);
  });

  it('getLatestReadings delegates to findLatest', async () => {
    const query = { buildingId: 'b-1' };
    await controller.getLatestReadings(user, query as any);
    expect(readingsSvc.findLatest).toHaveBeenCalledWith('t-1', ['b-1'], query);
  });

  it('getAggregatedReadings delegates to findAggregated', async () => {
    const query = { from: '2026-01-01', to: '2026-01-31', interval: 'daily' };
    await controller.getAggregatedReadings(user, query as any);
    expect(readingsSvc.findAggregated).toHaveBeenCalledWith('t-1', ['b-1'], query);
  });

  /* -- Alerts -- */

  it('listAlerts delegates with query filters', async () => {
    const query = { status: 'active', severity: 'critical' };
    await controller.listAlerts(user, query as any);
    expect(alertsSvc.findAll).toHaveBeenCalledWith('t-1', ['b-1'], query);
  });

  it('getAlert delegates with id', async () => {
    alertsSvc.findOne.mockResolvedValue({ id: 'a-1' });
    await controller.getAlert('a-1', user);
    expect(alertsSvc.findOne).toHaveBeenCalledWith('a-1', 't-1', ['b-1']);
  });
});
