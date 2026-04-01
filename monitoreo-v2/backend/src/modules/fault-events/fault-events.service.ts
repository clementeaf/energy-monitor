import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaultEvent } from '../platform/entities/fault-event.entity';
import { QueryFaultEventsDto } from './dto/query-fault-events.dto';

@Injectable()
export class FaultEventsService {
  constructor(
    @InjectRepository(FaultEvent)
    private readonly repo: Repository<FaultEvent>,
  ) {}

  async findAll(
    tenantId: string,
    buildingIds: string[],
    filters: QueryFaultEventsDto,
  ): Promise<FaultEvent[]> {
    const qb = this.repo
      .createQueryBuilder('fe')
      .where('fe.tenant_id = :tenantId', { tenantId })
      .orderBy('fe.started_at', 'DESC');

    if (buildingIds.length > 0) {
      qb.andWhere('fe.building_id IN (:...buildingIds)', { buildingIds });
    }

    if (filters.buildingId) {
      qb.andWhere('fe.building_id = :buildingId', { buildingId: filters.buildingId });
    }

    if (filters.meterId) {
      qb.andWhere('fe.meter_id = :meterId', { meterId: filters.meterId });
    }

    if (filters.severity) {
      qb.andWhere('fe.severity = :severity', { severity: filters.severity });
    }

    if (filters.faultType) {
      qb.andWhere('fe.fault_type = :faultType', { faultType: filters.faultType });
    }

    if (filters.dateFrom) {
      qb.andWhere('fe.started_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('fe.started_at <= :dateTo', { dateTo: filters.dateTo });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<FaultEvent | null> {
    const qb = this.repo
      .createQueryBuilder('fe')
      .where('fe.id = :id', { id })
      .andWhere('fe.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('fe.building_id IN (:...buildingIds)', { buildingIds });
    }

    return qb.getOne();
  }
}
