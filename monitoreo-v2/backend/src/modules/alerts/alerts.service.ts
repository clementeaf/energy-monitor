import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformAlert } from '../platform/entities/platform-alert.entity';
import { AlertQueryDto } from './dto/alert-query.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(PlatformAlert)
    private readonly repo: Repository<PlatformAlert>,
  ) {}

  async findAll(
    tenantId: string,
    buildingIds: string[],
    filters: AlertQueryDto,
  ): Promise<PlatformAlert[]> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .orderBy('a.created_at', 'DESC');

    if (buildingIds.length > 0) {
      qb.andWhere('a.building_id IN (:...buildingIds)', { buildingIds });
    }

    if (filters.status) {
      qb.andWhere('a.status = :status', { status: filters.status });
    }

    if (filters.severity) {
      qb.andWhere('a.severity = :severity', { severity: filters.severity });
    }

    if (filters.buildingId) {
      qb.andWhere('a.building_id = :buildingId', { buildingId: filters.buildingId });
    }

    if (filters.meterId) {
      qb.andWhere('a.meter_id = :meterId', { meterId: filters.meterId });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<PlatformAlert | null> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.id = :id', { id })
      .andWhere('a.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('a.building_id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getOne();
  }

  async acknowledge(
    id: string,
    tenantId: string,
    buildingIds: string[],
    userId: string,
  ): Promise<PlatformAlert | null> {
    const alert = await this.findOne(id, tenantId, buildingIds);
    if (!alert) return null;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    return this.repo.save(alert);
  }

  async resolve(
    id: string,
    tenantId: string,
    buildingIds: string[],
    userId: string,
    resolutionNotes?: string,
  ): Promise<PlatformAlert | null> {
    const alert = await this.findOne(id, tenantId, buildingIds);
    if (!alert) return null;

    alert.status = 'resolved';
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    alert.resolutionNotes = resolutionNotes ?? null;

    return this.repo.save(alert);
  }
}
