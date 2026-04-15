import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { ConnectorRegistry } from './connectors/connector.registry';
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
  integrationType: 'rest_api',
  status: 'active' as const,
  config: { url: 'https://api.example.com' },
  lastSyncAt: null,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let service: Record<string, jest.Mock>;
  let registry: Record<string, jest.Mock>;

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

    registry = {
      listTypes: jest.fn().mockReturnValue([
        { type: 'rest_api', label: 'REST API' },
        { type: 'webhook', label: 'Webhook' },
        { type: 'mqtt', label: 'MQTT' },
        { type: 'ftp', label: 'FTP' },
      ]),
    };

    const module = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        { provide: IntegrationsService, useValue: service },
        { provide: ConnectorRegistry, useValue: registry },
      ],
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

  it('findOne returns integration', async () => {
    service.findOne.mockResolvedValue(integration);
    const result = await controller.findOne('int-1', user);
    expect(result).toEqual(integration);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue(integration);
    const dto = { name: 'New', integrationType: 'rest_api', config: { url: 'https://x.com' } };
    const result = await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith('t-1', dto);
    expect(result).toEqual(integration);
  });

  it('update throws when missing', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update('x', { name: 'y' }, user)).rejects.toThrow(NotFoundException);
  });

  it('update delegates to service', async () => {
    service.update.mockResolvedValue(integration);
    const result = await controller.update('int-1', { name: 'Updated' }, user);
    expect(service.update).toHaveBeenCalledWith('int-1', 't-1', { name: 'Updated' });
    expect(result).toEqual(integration);
  });

  it('remove throws when missing', async () => {
    service.remove.mockResolvedValue(false);
    await expect(controller.remove('x', user)).rejects.toThrow(NotFoundException);
  });

  it('remove delegates to service', async () => {
    service.remove.mockResolvedValue(true);
    await controller.remove('int-1', user);
    expect(service.remove).toHaveBeenCalledWith('int-1', 't-1');
  });

  it('sync delegates to service', async () => {
    service.triggerSync.mockResolvedValue({ id: '1', status: 'success', recordsSynced: 5 });
    const result = await controller.sync('int-1', user);
    expect(service.triggerSync).toHaveBeenCalledWith('int-1', 't-1');
    expect(result).toEqual({ id: '1', status: 'success', recordsSynced: 5 });
  });

  it('syncLogs delegates to service with defaults', async () => {
    service.findSyncLogs.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    const result = await controller.syncLogs('int-1', user, {});
    expect(service.findSyncLogs).toHaveBeenCalledWith('int-1', 't-1', 1, 20);
    expect(result.total).toBe(0);
  });

  it('syncLogs uses provided page and limit', async () => {
    service.findSyncLogs.mockResolvedValue({ items: [], total: 100, page: 3, limit: 10 });
    await controller.syncLogs('int-1', user, { page: 3, limit: 10 });
    expect(service.findSyncLogs).toHaveBeenCalledWith('int-1', 't-1', 3, 10);
  });

  it('getSupportedTypes returns types from registry', () => {
    const types = controller.getSupportedTypes();
    expect(types).toHaveLength(4);
    expect(types[0]).toEqual({ type: 'rest_api', label: 'REST API' });
  });
});
