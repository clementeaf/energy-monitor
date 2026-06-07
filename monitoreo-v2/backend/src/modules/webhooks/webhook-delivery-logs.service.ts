import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WebhookDeliveryLog,
  type WebhookDeliveryStatus,
} from '../platform/entities/webhook-delivery-log.entity';

export interface WebhookDeliveryLogListParams {
  status?: WebhookDeliveryStatus;
  limit?: number;
  offset?: number;
}

/**
 * Read-only access to webhook delivery audit logs.
 */
@Injectable()
export class WebhookDeliveryLogsService {
  constructor(
    @InjectRepository(WebhookDeliveryLog)
    private readonly repo: Repository<WebhookDeliveryLog>,
  ) {}

  /**
   * Returns paginated webhook delivery logs for a tenant.
   */
  async findAll(
    tenantId: string,
    params: WebhookDeliveryLogListParams,
  ): Promise<{ data: WebhookDeliveryLog[]; total: number }> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    const qb = this.repo
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .orderBy('l.created_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (params.status) {
      qb.andWhere('l.status = :status', { status: params.status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
