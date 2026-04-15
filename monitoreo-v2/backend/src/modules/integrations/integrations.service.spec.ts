import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { Integration } from '../platform/entities/integration.entity';
import { IntegrationSyncLog } from '../platform/entities/integration-sync-log.entity';
import { ConnectorRegistry } from './connectors/connector.registry';
import type { IntegrationConnector, SyncResult } from './connectors/connector.interface';

const TENANT = 't-1';

function mockIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    id: 'int-1',
    tenantId: TENANT,
    name: 'Test API',
    integrationType: 'rest_api',
    status: 'active',
    config: { url: 'https://api.example.com/data' },
    lastSyncAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Integration;
}

function mockSyncLog(overrides: Partial<IntegrationSyncLog> = {}): IntegrationSyncLog {
  return {
    id: '1',
    integrationId: 'int-1',
    status: 'success',
    recordsSynced: 5,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  } as IntegrationSyncLog;
}

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let integrationRepo: Record<string, jest.Mock>;
  let syncLogRepo: Record<string, jest.Mock>;
  let registry: { get: jest.Mock; validateConfig: jest.Mock };
  let mockConnector: IntegrationConnector;

  beforeEach(async () => {
    integrationRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
      findOneBy: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id ?? 'new-id' })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    syncLogRepo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id ?? '1' })),
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
    };

    mockConnector = {
      type: 'rest_api',
      label: 'REST API',
      validateConfig: jest.fn().mockReturnValue([]),
      sync: jest.fn<Promise<SyncResult>, [Integration]>().mockResolvedValue({
        status: 'success',
        recordsSynced: 5,
        errorMessage: null,
      }),
    };

    registry = {
      get: jest.fn().mockReturnValue(mockConnector),
      validateConfig: jest.fn().mockReturnValue([]),
    };

    const module = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: getRepositoryToken(Integration), useValue: integrationRepo },
        { provide: getRepositoryToken(IntegrationSyncLog), useValue: syncLogRepo },
        { provide: ConnectorRegistry, useValue: registry },
      ],
    }).compile();

    service = module.get(IntegrationsService);
  });

  /* ------ CRUD ------ */

  describe('findAll', () => {
    it('returns integrations for tenant', async () => {
      const qb = integrationRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([mockIntegration()]);

      const result = await service.findAll(TENANT);
      expect(result).toHaveLength(1);
      expect(integrationRepo.createQueryBuilder).toHaveBeenCalledWith('i');
    });

    it('applies integrationType filter', async () => {
      const qb = integrationRepo.createQueryBuilder();
      await service.findAll(TENANT, { integrationType: 'rest_api' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'i.integration_type = :integrationType',
        { integrationType: 'rest_api' },
      );
    });

    it('applies status filter', async () => {
      const qb = integrationRepo.createQueryBuilder();
      await service.findAll(TENANT, { status: 'active' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'i.status = :status',
        { status: 'active' },
      );
    });
  });

  describe('findOne', () => {
    it('returns integration when found', async () => {
      const integration = mockIntegration();
      integrationRepo.findOneBy.mockResolvedValue(integration);
      const result = await service.findOne('int-1', TENANT);
      expect(result).toEqual(integration);
    });

    it('returns null when not found', async () => {
      integrationRepo.findOneBy.mockResolvedValue(null);
      const result = await service.findOne('missing', TENANT);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('validates config via registry', async () => {
      await service.create(TENANT, {
        name: 'New API',
        integrationType: 'rest_api',
        config: { url: 'https://api.com' },
      });
      expect(registry.validateConfig).toHaveBeenCalledWith('rest_api', { url: 'https://api.com' });
    });

    it('throws BadRequestException when config is invalid', async () => {
      registry.validateConfig.mockReturnValue(['url is required']);
      await expect(
        service.create(TENANT, {
          name: 'Bad',
          integrationType: 'rest_api',
          config: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates integration with defaults', async () => {
      await service.create(TENANT, {
        name: 'New API',
        integrationType: 'rest_api',
        config: { url: 'https://api.com' },
      });
      expect(integrationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT,
          name: 'New API',
          status: 'active',
          lastSyncAt: null,
          errorMessage: null,
        }),
      );
    });

    it('uses provided status', async () => {
      await service.create(TENANT, {
        name: 'Pending',
        integrationType: 'rest_api',
        status: 'pending',
        config: { url: 'https://api.com' },
      });
      expect(integrationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
      );
    });
  });

  describe('update', () => {
    it('returns null when not found', async () => {
      integrationRepo.findOneBy.mockResolvedValue(null);
      const result = await service.update('missing', TENANT, { name: 'x' });
      expect(result).toBeNull();
    });

    it('validates config when config changes', async () => {
      integrationRepo.findOneBy.mockResolvedValue(mockIntegration());
      await service.update('int-1', TENANT, { config: { url: 'https://new.com' } });
      expect(registry.validateConfig).toHaveBeenCalledWith('rest_api', { url: 'https://new.com' });
    });

    it('validates config when type changes', async () => {
      integrationRepo.findOneBy.mockResolvedValue(mockIntegration());
      await service.update('int-1', TENANT, { integrationType: 'webhook' });
      expect(registry.validateConfig).toHaveBeenCalledWith(
        'webhook',
        { url: 'https://api.example.com/data' },
      );
    });

    it('throws when new config is invalid', async () => {
      integrationRepo.findOneBy.mockResolvedValue(mockIntegration());
      registry.validateConfig.mockReturnValue(['url is required']);
      await expect(
        service.update('int-1', TENANT, { config: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not validate when neither config nor type change', async () => {
      integrationRepo.findOneBy.mockResolvedValue(mockIntegration());
      await service.update('int-1', TENANT, { name: 'Renamed' });
      expect(registry.validateConfig).not.toHaveBeenCalled();
    });

    it('updates fields', async () => {
      const existing = mockIntegration();
      integrationRepo.findOneBy.mockResolvedValue(existing);
      await service.update('int-1', TENANT, { name: 'Updated' });
      expect(integrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated' }),
      );
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      const result = await service.remove('int-1', TENANT);
      expect(result).toBe(true);
    });

    it('returns false when not found', async () => {
      integrationRepo.delete.mockResolvedValue({ affected: 0 });
      const result = await service.remove('missing', TENANT);
      expect(result).toBe(false);
    });
  });

  /* ------ triggerSync ------ */

  describe('triggerSync', () => {
    it('throws NotFoundException when integration missing', async () => {
      integrationRepo.findOneBy.mockResolvedValue(null);
      await expect(service.triggerSync('missing', TENANT)).rejects.toThrow(NotFoundException);
    });

    it('delegates to connector and logs success', async () => {
      const integration = mockIntegration();
      integrationRepo.findOneBy.mockResolvedValue(integration);

      const result = await service.triggerSync('int-1', TENANT);

      expect(registry.get).toHaveBeenCalledWith('rest_api');
      // sync receives a decrypted copy with same shape
      expect(mockConnector.sync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'int-1', integrationType: 'rest_api' }),
      );
      expect(syncLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: 'int-1',
          status: 'success',
          recordsSynced: 5,
          errorMessage: null,
        }),
      );
      expect(result.status).toBe('success');
    });

    it('sets integration to error status on sync failure', async () => {
      const integration = mockIntegration();
      integrationRepo.findOneBy.mockResolvedValue(integration);
      (mockConnector.sync as jest.Mock).mockResolvedValue({
        status: 'failed',
        recordsSynced: 0,
        errorMessage: 'Connection refused',
      });

      await service.triggerSync('int-1', TENANT);

      expect(integrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          errorMessage: 'Connection refused',
        }),
      );
    });

    it('resets error status to active on successful sync', async () => {
      const integration = mockIntegration({ status: 'error', errorMessage: 'old error' });
      integrationRepo.findOneBy.mockResolvedValue(integration);

      await service.triggerSync('int-1', TENANT);

      expect(integrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          errorMessage: null,
        }),
      );
    });

    it('resets pending status to active on successful sync', async () => {
      const integration = mockIntegration({ status: 'pending' });
      integrationRepo.findOneBy.mockResolvedValue(integration);

      await service.triggerSync('int-1', TENANT);

      expect(integrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
    });

    it('keeps active status on partial sync', async () => {
      const integration = mockIntegration({ status: 'active' });
      integrationRepo.findOneBy.mockResolvedValue(integration);
      (mockConnector.sync as jest.Mock).mockResolvedValue({
        status: 'partial',
        recordsSynced: 3,
        errorMessage: null,
      });

      await service.triggerSync('int-1', TENANT);

      expect(integrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active', errorMessage: null }),
      );
    });

    it('updates lastSyncAt', async () => {
      const integration = mockIntegration();
      integrationRepo.findOneBy.mockResolvedValue(integration);

      await service.triggerSync('int-1', TENANT);

      expect(integrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSyncAt: expect.any(Date),
        }),
      );
    });
  });

  /* ------ findSyncLogs ------ */

  describe('findSyncLogs', () => {
    it('throws NotFoundException when integration missing', async () => {
      integrationRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findSyncLogs('missing', TENANT, 1, 20)).rejects.toThrow(NotFoundException);
    });

    it('returns paginated logs', async () => {
      integrationRepo.findOneBy.mockResolvedValue(mockIntegration());
      syncLogRepo.count.mockResolvedValue(50);
      syncLogRepo.find.mockResolvedValue([mockSyncLog()]);

      const result = await service.findSyncLogs('int-1', TENANT, 2, 10);

      expect(result.total).toBe(50);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.items).toHaveLength(1);
      expect(syncLogRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });
});
