import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

const user: JwtPayload = {
  sub: 'u-1',
  email: 'test@test.com',
  tenantId: 't-1',
  roleId: 'r-1',
  roleSlug: 'corp_admin',
  permissions: ['integrations:read', 'integrations:create', 'integrations:update'],
  buildingIds: [],
};

const integration = {
  id: 'int-1',
  tenantId: 't-1',
  name: 'API Externa',
  integrationType: 'rest',
  status: 'active' as const,
  config: {},
  lastSyncAt: null,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      triggerSync: jest.fn(),
      findSyncLogs: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [{ provide: IntegrationsService, useValue: service }],
    }).compile();

    controller = module.get(IntegrationsController);
  });

  it('findAll delegates to service', async () => {
    service.findAll.mockResolvedValue([integration]);
    const result = await controller.findAll(user, {});
    expect(service.findAll).toHaveBeenCalledWith('t-1', {});
    expect(result).toEqual([integration]);
  });

  it('findOne throws when missing', async () => {
    service.findOne.mockResolvedValue(null);
    await expect(controller.findOne('x', user)).rejects.toThrow(NotFoundException);
  });

  it('sync delegates to service', async () => {
    service.triggerSync.mockResolvedValue({ id: '1', status: 'success' });
    const result = await controller.sync('int-1', user);
    expect(service.triggerSync).toHaveBeenCalledWith('int-1', 't-1');
    expect(result).toEqual({ id: '1', status: 'success' });
  });
});
