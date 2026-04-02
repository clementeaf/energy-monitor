import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from '../platform/entities/integration.entity';
import { IntegrationSyncLog } from '../platform/entities/integration-sync-log.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

export interface IntegrationSyncLogsResult {
  items: IntegrationSyncLog[];
  total: number;
  page: number;
  limit: number;
}

/**
 * CRUD for external integrations and read-only sync log history.
 */
@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepo: Repository<Integration>,
    @InjectRepository(IntegrationSyncLog)
    private readonly syncLogRepo: Repository<IntegrationSyncLog>,
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
    const row = this.integrationRepo.create({
      tenantId,
      name: dto.name,
      integrationType: dto.integrationType,
      status: dto.status ?? 'active',
      config: dto.config,
      lastSyncAt: null,
      errorMessage: null,
    });
    return this.integrationRepo.save(row);
  }

  async update(id: string, tenantId: string, dto: UpdateIntegrationDto): Promise<Integration | null> {
    const row = await this.integrationRepo.findOneBy({ id, tenantId });
    if (!row) return null;

    if (dto.name !== undefined) row.name = dto.name;
    if (dto.integrationType !== undefined) row.integrationType = dto.integrationType;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.config !== undefined) row.config = dto.config;

    return this.integrationRepo.save(row);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.integrationRepo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Records a successful sync run and updates integration timestamps (read-only API connector stub).
   * @param id - Integration id
   * @param tenantId - Tenant scope
   * @returns Persisted sync log row
   */
  async triggerSync(id: string, tenantId: string): Promise<IntegrationSyncLog> {
    const integration = await this.integrationRepo.findOneBy({ id, tenantId });
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const startedAt = new Date();
    const completedAt = new Date();

    const log = this.syncLogRepo.create({
      integrationId: id,
      status: 'success',
      recordsSynced: 0,
      errorMessage: null,
      startedAt,
      completedAt,
    });
    const saved = await this.syncLogRepo.save(log);

    integration.lastSyncAt = completedAt;
    integration.errorMessage = null;
    if (integration.status === 'error' || integration.status === 'pending') {
      integration.status = 'active';
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
