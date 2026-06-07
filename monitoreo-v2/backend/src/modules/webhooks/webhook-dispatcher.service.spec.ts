import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhookDispatcherService, signWebhookPayload } from './webhook-dispatcher.service';
import { WebhookSubscription } from '../platform/entities/webhook-subscription.entity';
import { WebhookDeliveryLog } from '../platform/entities/webhook-delivery-log.entity';

describe('signWebhookPayload', () => {
  it('produces deterministic HMAC-SHA256 hex', () => {
    const sig = signWebhookPayload('secret-key-12345678', 1_700_000_000, '{"event":"test"}');
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;
  let subscriptionRepo: { find: jest.Mock };
  let deliveryLogRepo: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    subscriptionRepo = { find: jest.fn().mockResolvedValue([]) };
    deliveryLogRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'log-1', ...data })),
    };

    const module = await Test.createTestingModule({
      providers: [
        WebhookDispatcherService,
        { provide: getRepositoryToken(WebhookSubscription), useValue: subscriptionRepo },
        { provide: getRepositoryToken(WebhookDeliveryLog), useValue: deliveryLogRepo },
      ],
    }).compile();

    service = module.get(WebhookDispatcherService);
  });

  it('returns zero counts when no subscriptions', async () => {
    const result = await service.dispatch('t-1', 'reading.stale', {
      event: 'reading.stale',
      tenantId: 't-1',
      occurredAt: new Date().toISOString(),
    });
    expect(result).toEqual({ delivered: 0, failed: 0 });
  });

  it('delivers with HMAC headers and logs success', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as typeof fetch;

    subscriptionRepo.find.mockResolvedValue([
      {
        id: 'sub-1',
        tenantId: 't-1',
        eventType: 'reading.stale',
        url: 'https://hooks.example.com/events',
        secret: 'plain-secret-12345678',
        active: true,
      },
    ]);

    const result = await service.dispatch('t-1', 'reading.stale', {
      event: 'reading.stale',
      tenantId: 't-1',
      meterId: 'm-1',
      occurredAt: '2026-06-06T12:00:00Z',
    });

    expect(result.delivered).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toMatchObject({
      'X-Webhook-Event': 'reading.stale',
    });
    expect(String((options.headers as Record<string, string>)['X-Webhook-Signature'])).toMatch(
      /^sha256=[a-f0-9]{64}$/,
    );
    expect(deliveryLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', httpStatus: 200 }),
    );
  });

  it('logs failure after retries exhausted', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    global.fetch = fetchMock as typeof fetch;

    subscriptionRepo.find.mockResolvedValue([
      {
        id: 'sub-1',
        tenantId: 't-1',
        eventType: 'gap.detected',
        url: 'https://hooks.example.com/gap',
        secret: 'plain-secret-12345678',
        active: true,
      },
    ]);

    const result = await service.dispatch('t-1', 'gap.detected', {
      event: 'gap.detected',
      tenantId: 't-1',
      occurredAt: '2026-06-06T12:00:00Z',
    });

    expect(result.failed).toBe(1);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(deliveryLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('rejects blocked URLs without fetch', async () => {
    subscriptionRepo.find.mockResolvedValue([
      {
        id: 'sub-1',
        tenantId: 't-1',
        eventType: 'meter.offline',
        url: 'http://127.0.0.1/hook',
        secret: 'plain-secret-12345678',
        active: true,
      },
    ]);

    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    const result = await service.dispatch('t-1', 'meter.offline', {
      event: 'meter.offline',
      tenantId: 't-1',
      occurredAt: '2026-06-06T12:00:00Z',
    });

    expect(result.failed).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
