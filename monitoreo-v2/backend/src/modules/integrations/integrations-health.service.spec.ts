import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IntegrationsHealthService } from './integrations-health.service';
import { Integration } from '../platform/entities/integration.entity';
import { IntegrationSyncLog } from '../platform/entities/integration-sync-log.entity';
import { WebhookDeliveryLog } from '../platform/entities/webhook-delivery-log.entity';
import { WebhookSubscriptionsService } from '../webhooks/webhook-subscriptions.service';

describe('IntegrationsHealthService', () => {
  let service: IntegrationsHealthService;

  const integrationRepo = {
    find: jest.fn(),
  };
  const syncLogRepo = {
    findOne: jest.fn(),
  };
  const deliveryLogRepo = {
    createQueryBuilder: jest.fn(),
  };
  const webhookSubscriptionsService = {
    countActive: jest.fn().mockResolvedValue(3),
  };

  beforeEach(async () => {
    integrationRepo.find.mockResolvedValue([
      {
        id: 'int-1',
        tenantId: 't-1',
        name: 'MQTT Broker',
        integrationType: 'mqtt',
        status: 'active',
        lastSyncAt: new Date(Date.now() - 60_000),
        errorMessage: null,
      },
    ]);
    syncLogRepo.findOne.mockResolvedValue({
      status: 'success',
      errorMessage: null,
    });

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(5),
    };
    deliveryLogRepo.createQueryBuilder.mockReturnValue(qb);

    const module = await Test.createTestingModule({
      providers: [
        IntegrationsHealthService,
        { provide: getRepositoryToken(Integration), useValue: integrationRepo },
        { provide: getRepositoryToken(IntegrationSyncLog), useValue: syncLogRepo },
        { provide: getRepositoryToken(WebhookDeliveryLog), useValue: deliveryLogRepo },
        { provide: WebhookSubscriptionsService, useValue: webhookSubscriptionsService },
      ],
    }).compile();

    service = module.get(IntegrationsHealthService);
  });

  it('returns integration sync latency and webhook stats', async () => {
    const health = await service.getHealth('t-1');

    expect(health.integrations).toHaveLength(1);
    expect(health.integrations[0].integrationType).toBe('mqtt');
    expect(health.integrations[0].syncLatencyMs).toBeGreaterThanOrEqual(60_000);
    expect(health.webhooks.activeSubscriptions).toBe(3);
    expect(health.webhooks.deliveriesLast24h).toBe(5);
    expect(health.checkedAt).toBeDefined();
  });
});
