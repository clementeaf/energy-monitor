import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: ['alerts:read', 'alerts:update'],
  buildingIds: [],
};

const alert = {
  id: 'alert-1',
  tenantId: 't-1',
  alertRuleId: null,
  buildingId: 'b-1',
  meterId: 'm-1',
  alertTypeCode: 'METER_OFFLINE',
  severity: 'high',
  status: 'active',
  message: 'Medidor sin datos',
  triggeredValue: null,
  thresholdValue: null,
  assignedTo: null,
  acknowledgedBy: null,
  acknowledgedAt: null,
  resolvedBy: null,
  resolvedAt: null,
  resolutionNotes: null,
  createdAt: new Date(),
};

describe('AlertsController', () => {
  let controller: AlertsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      acknowledge: jest.fn(),
      resolve: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [{ provide: AlertsService, useValue: service }],
    }).compile();

    controller = module.get(AlertsController);
  });

  it('findAll delegates to service with tenant, buildingIds and filters', async () => {
    service.findAll.mockResolvedValue([alert]);
    const query = { status: 'active' };
    const result = await controller.findAll(user, query);
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], query);
    expect(result).toEqual([alert]);
  });

  it('findOne returns alert', async () => {
    service.findOne.mockResolvedValue(alert);
    const result = await controller.findOne('alert-1', user);
    expect(result).toEqual(alert);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('acknowledge returns updated alert', async () => {
    const acked = { ...alert, status: 'acknowledged', acknowledgedBy: 'u-1' };
    service.acknowledge.mockResolvedValue(acked);
    const result = await controller.acknowledge('alert-1', user);
    expect(service.acknowledge).toHaveBeenCalledWith('alert-1', 't-1', [], 'u-1');
    expect(result.status).toBe('acknowledged');
  });

  it('acknowledge throws NotFoundException when not found', async () => {
    service.acknowledge.mockResolvedValue(null);
    await expect(controller.acknowledge('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('resolve returns updated alert with notes', async () => {
    const resolved = { ...alert, status: 'resolved', resolvedBy: 'u-1', resolutionNotes: 'Fijo' };
    service.resolve.mockResolvedValue(resolved);
    const result = await controller.resolve('alert-1', { resolutionNotes: 'Fijo' }, user);
    expect(service.resolve).toHaveBeenCalledWith('alert-1', 't-1', [], 'u-1', 'Fijo');
    expect(result.status).toBe('resolved');
  });

  it('resolve throws NotFoundException when not found', async () => {
    service.resolve.mockResolvedValue(null);
    await expect(controller.resolve('missing', {}, user)).rejects.toThrow(NotFoundException);
  });
});
