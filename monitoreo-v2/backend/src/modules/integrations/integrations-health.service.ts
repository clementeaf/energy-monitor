import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from '../platform/entities/integration.entity';
import { IntegrationSyncLog } from '../platform/entities/integration-sync-log.entity';
import { WebhookDeliveryLog } from '../platform/entities/webhook-delivery-log.entity';
import { WebhookSubscriptionsService } from '../webhooks/webhook-subscriptions.service';

export interface IntegrationHealthItem {
  id: string;
  name: string;
  integrationType: string;
  status: string;
  lastSyncAt: string | null;
  syncLatencyMs: number | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}

export interface WebhookHealthSummary {
  activeSubscriptions: number;
  deliveriesLast24h: number;
  failedLast24h: number;
}

export interface IntegrationsHealthResponse {
  integrations: IntegrationHealthItem[];
  webhooks: WebhookHealthSummary;
  checkedAt: string;
}

/**
 * Builds integration + webhook health snapshot for tenant (GAP-155).
 */
@Injectable()
export class IntegrationsHealthService {
  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepo: Repository<Integration>,
    @InjectRepository(IntegrationSyncLog)
    private readonly syncLogRepo: Repository<IntegrationSyncLog>,
    @InjectRepository(WebhookDeliveryLog)
    private readonly deliveryLogRepo: Repository<WebhookDeliveryLog>,
    private readonly webhookSubscriptionsService: WebhookSubscriptionsService,
  ) {}

  /**
   * Returns last sync latency per integration and webhook delivery stats.
   */
  async getHealth(tenantId: string): Promise<IntegrationsHealthResponse> {
    const integrations = await this.integrationRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });

    const items: IntegrationHealthItem[] = [];
    for (const integration of integrations) {
      const latestLog = await this.syncLogRepo.findOne({
        where: { integrationId: integration.id },
        order: { startedAt: 'DESC' },
      });

      const syncLatencyMs =
        integration.lastSyncAt !== null
          ? Date.now() - integration.lastSyncAt.getTime()
          : null;

      items.push({
        id: integration.id,
        name: integration.name,
        integrationType: integration.integrationType,
        status: integration.status,
        lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
        syncLatencyMs,
        lastSyncStatus: latestLog?.status ?? null,
        lastSyncError: latestLog?.errorMessage ?? integration.errorMessage,
      });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deliveriesLast24h = await this.deliveryLogRepo
      .createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere('d.created_at >= :since', { since })
      .getCount();

    const failedLast24h = await this.deliveryLogRepo
      .createQueryBuilder('d')
      .where('d.tenant_id = :tenantId', { tenantId })
      .andWhere('d.created_at >= :since', { since })
      .andWhere("d.status = 'failed'")
      .getCount();

    const activeSubscriptions = await this.webhookSubscriptionsService.countActive(tenantId);

    return {
      integrations: items,
      webhooks: {
        activeSubscriptions,
        deliveriesLast24h,
        failedLast24h,
      },
      checkedAt: new Date().toISOString(),
    };
  }
}
