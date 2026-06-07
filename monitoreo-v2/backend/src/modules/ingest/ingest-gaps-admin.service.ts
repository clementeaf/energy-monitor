import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestGap, type IngestGapStatus } from '../platform/entities/ingest-gap.entity';

export interface IngestGapListParams {
  status?: IngestGapStatus;
  limit?: number;
  offset?: number;
}

/**
 * Lists ingest gaps for admin/monitoring views.
 */
@Injectable()
export class IngestGapsAdminService {
  constructor(
    @InjectRepository(IngestGap)
    private readonly gapRepo: Repository<IngestGap>,
  ) {}

  /**
   * Returns paginated ingest gaps for a tenant.
   */
  async findAll(
    tenantId: string,
    params: IngestGapListParams,
  ): Promise<{ data: IngestGap[]; total: number }> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    const qb = this.gapRepo
      .createQueryBuilder('g')
      .where('g.tenant_id = :tenantId', { tenantId })
      .orderBy('g.detected_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (params.status) {
      qb.andWhere('g.status = :status', { status: params.status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
