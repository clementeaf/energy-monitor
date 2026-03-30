import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AlertRulesController } from './alert-rules.controller';
import { AlertRulesService } from './alert-rules.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'super_admin',
  permissions: [
    'admin_alerts:read',
    'admin_alerts:create',
    'admin_alerts:update',
    'admin_alerts:delete',
  ],
  buildingIds: [],
};

const rule = {
  id: 'rule-1',
  tenantId: 't-1',
  buildingId: null,
  alertTypeCode: 'METER_OFFLINE',
  name: 'Medidor fuera de linea',
  description: null,
  severity: 'high',
  isActive: true,
  checkIntervalSeconds: 900,
  config: {},
  escalationL1Minutes: 0,
  escalationL2Minutes: 60,
  escalationL3Minutes: 1440,
  notifyEmail: true,
  notifyPush: false,
  notifyWhatsapp: false,
  notifySms: false,
  createdBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AlertRulesController', () => {
  let controller: AlertRulesController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [AlertRulesController],
      providers: [{ provide: AlertRulesService, useValue: service }],
    }).compile();

    controller = module.get(AlertRulesController);
  });

  it('findAll delegates to service with tenant, buildingIds and filter', async () => {
    service.findAll.mockResolvedValue([rule]);
    const result = await controller.findAll(user, 'b-1');
    expect(service.findAll).toHaveBeenCalledWith('t-1', [], 'b-1');
    expect(result).toEqual([rule]);
  });

  it('findOne returns rule', async () => {
    service.findOne.mockResolvedValue(rule);
    const result = await controller.findOne('rule-1', user);
    expect(result).toEqual(rule);
  });

  it('findOne throws NotFoundException when not found', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('missing', user)).rejects.toThrow(NotFoundException);
  });

  it('create delegates to service with createdBy', async () => {
    service.create.mockResolvedValue(rule);
    const dto = { alertTypeCode: 'METER_OFFLINE', name: 'Test', severity: 'high' };
    const result = await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('t-1', dto, 'u-1');
    expect(result).toEqual(rule);
  });

  it('update returns updated rule', async () => {
    service.update.mockResolvedValue({ ...rule, name: 'Nuevo' });
    const result = await controller.update('rule-1', { name: 'Nuevo' }, user);
    expect(result.name).toBe('Nuevo');
  });

  it('update throws NotFoundException when not found', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('missing', { name: 'X' }, user)).rejects.toThrow(NotFoundException);
  });

  it('remove succeeds', async () => {
    service.remove.mockResolvedValue(true);
    await expect(controller.remove('rule-1', user)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException when not found', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('missing', user)).rejects.toThrow(NotFoundException);
  });
});
