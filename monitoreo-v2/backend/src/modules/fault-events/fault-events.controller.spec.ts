import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FaultEventsController } from './fault-events.controller';
import { FaultEventsService } from './fault-events.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: ['monitoring_faults:read'],
  buildingIds: [],
};

const event = {
  id: 'fe-1',
  tenantId: 't-1',
  buildingId: 'b-1',
  meterId: null,
  concentratorId: null,
  faultType: 'voltage_anomaly',
  severity: 'high',
  description: 'Voltage spike detected',
  startedAt: new Date(),
  resolvedAt: null,
  resolvedBy: null,
  resolutionNotes: null,
  createdAt: new Date(),
};

describe('FaultEventsController', () => {
  let controller: FaultEventsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [FaultEventsController],
      providers: [{ provide: FaultEventsService, useValue: service }],
    }).compile();

    controller = module.get(FaultEventsController);
  });

  it('findAll delegates to service with tenant, buildingIds, and query', async () => {
    service.findAll.mockResolvedValue([event]);
    const query = { severity: 'high' };
    const result = await controller.findAll(query, user);
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], query);
    expect(result).toEqual([event]);
  });

  it('findOne returns event', async () => {
    service.findOne.mockResolvedValue(event);
    const result = await controller.findOne('fe-1', user);
    expect(result).toEqual(event);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });
});
