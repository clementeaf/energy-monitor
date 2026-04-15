import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from '../platform/entities/integration.entity';
import { IntegrationSyncLog } from '../platform/entities/integration-sync-log.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { ConnectorRegistry } from './connectors/connector.registry';
import { encryptConfig, decryptConfig } from '../../common/crypto/config-encryption';

export interface IntegrationSyncLogsResult {
  items: IntegrationSyncLog[];
  total: number;
  page: number;
  limit: number;
}

/**
 * CRUD for external integrations, config validation, and connector-based sync.
 */
@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepo: Repository<Integration>,
    @InjectRepository(IntegrationSyncLog)
    private readonly syncLogRepo: Repository<IntegrationSyncLog>,
    private readonly connectorRegistry: ConnectorRegistry,
  ) {}

  async findAll(
    tenantId: string,
    filters?: { integrationType?: string; status?: string },
  ): Promise<Integration[]> {
    const qb = this.integrationRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .orderBy('i.name', 'ASC');

    if (filters?.integrationType) {
      qb.andWhere('i.integration_type = :integrationType', {
        integrationType: filters.integrationType,
      });
    }

    if (filters?.status) {
      qb.andWhere('i.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Integration | null> {
    return this.integrationRepo.findOneBy({ id, tenantId });
  }

  async create(tenantId: string, dto: CreateIntegrationDto): Promise<Integration> {
    const configErrors = this.connectorRegistry.validateConfig(dto.integrationType, dto.config);
    if (configErrors.length > 0) {
      throw new BadRequestException(configErrors);
    }

    const row = this.integrationRepo.create({
      tenantId,
      name: dto.name,
      integrationType: dto.integrationType,
      status: dto.status ?? 'active',
      config: encryptConfig(dto.config),
      lastSyncAt: null,
      errorMessage: null,
    });
    return this.integrationRepo.save(row);
  }

  async update(id: string, tenantId: string, dto: UpdateIntegrationDto): Promise<Integration | null> {
    const row = await this.integrationRepo.findOneBy({ id, tenantId });
    if (!row) return null;

    // If changing type or config, validate the new config against the (possibly new) type
    const newType = dto.integrationType ?? row.integrationType;
    const newConfig = dto.config ?? row.config;
    if (dto.integrationType !== undefined || dto.config !== undefined) {
      const configErrors = this.connectorRegistry.validateConfig(newType, newConfig);
      if (configErrors.length > 0) {
        throw new BadRequestException(configErrors);
      }
    }

    if (dto.name !== undefined) row.name = dto.name;
    if (dto.integrationType !== undefined) row.integrationType = dto.integrationType;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.config !== undefined) row.config = encryptConfig(dto.config);

    return this.integrationRepo.save(row);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.integrationRepo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Execute a real sync via the connector for this integration type.
   * Logs the result and updates integration status accordingly.
   */
  async triggerSync(id: string, tenantId: string): Promise<IntegrationSyncLog> {
    const integration = await this.integrationRepo.findOneBy({ id, tenantId });
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const connector = this.connectorRegistry.get(integration.integrationType);
    const startedAt = new Date();

    // Decrypt config secrets before passing to connector
    const decrypted = { ...integration, config: decryptConfig(integration.config) } as Integration;
    const result = await connector.sync(decrypted);

    const completedAt = new Date();
    const log = this.syncLogRepo.create({
      integrationId: id,
      status: result.status,
      recordsSynced: result.recordsSynced,
      errorMessage: result.errorMessage,
      startedAt,
      completedAt,
    });
    const saved = await this.syncLogRepo.save(log);

    // Update integration status based on sync result
    integration.lastSyncAt = completedAt;
    if (result.status === 'failed') {
      integration.status = 'error';
      integration.errorMessage = result.errorMessage;
    } else {
      integration.errorMessage = null;
      if (integration.status === 'error' || integration.status === 'pending') {
        integration.status = 'active';
      }
    }
    await this.integrationRepo.save(integration);

    return saved;
  }

  async findSyncLogs(
    integrationId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<IntegrationSyncLogsResult> {
    const integration = await this.integrationRepo.findOneBy({ id: integrationId, tenantId });
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const where = { integrationId };
    const total = await this.syncLogRepo.count({ where });
    const skip = (page - 1) * limit;
    const items = await this.syncLogRepo.find({
      where,
      order: { startedAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit };
  }
}
