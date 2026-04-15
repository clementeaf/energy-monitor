import { createHmac } from 'crypto';
import { WebhookConnector } from './webhook.connector';
import type { Integration } from '../../platform/entities/integration.entity';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeIntegration(config: Record<string, unknown>): Integration {
  return {
    id: 'int-2',
    tenantId: 't-1',
    name: 'Test Webhook',
    integrationType: 'webhook',
    status: 'active',
    config,
    lastSyncAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Integration;
}

describe('WebhookConnector', () => {
  let connector: WebhookConnector;

  beforeEach(() => {
    connector = new WebhookConnector();
    mockFetch.mockReset();
  });

  describe('validateConfig', () => {
    it('requires url', () => {
      const errors = connector.validateConfig({});
      expect(errors).toContain('url is required and must be a string');
    });

    it('rejects non-http url', () => {
      const errors = connector.validateConfig({ url: 'ftp://host.com' });
      expect(errors).toContain('url must use http or https protocol');
    });

    it('rejects invalid url', () => {
      const errors = connector.validateConfig({ url: 'not-url' });
      expect(errors).toContain('url must be a valid URL');
    });

    it('accepts valid minimal config', () => {
      const errors = connector.validateConfig({ url: 'https://hooks.example.com/notify' });
      expect(errors).toHaveLength(0);
    });

    it('rejects non-string secret', () => {
      const errors = connector.validateConfig({ url: 'https://x.com', secret: 123 });
      expect(errors).toContain('secret must be a string');
    });

    it('rejects non-array events', () => {
      const errors = connector.validateConfig({ url: 'https://x.com', events: 'bad' });
      expect(errors).toContain('events must be an array of strings');
    });

    it('rejects non-string events entries', () => {
      const errors = connector.validateConfig({ url: 'https://x.com', events: [1, 2] });
      expect(errors).toContain('events must contain only strings');
    });

    it('rejects invalid timeoutMs', () => {
      const errors = connector.validateConfig({ url: 'https://x.com', timeoutMs: 100 });
      expect(errors).toContain('timeoutMs must be a number >= 1000');
    });

    it('accepts full valid config', () => {
      const errors = connector.validateConfig({
        url: 'https://hooks.example.com/notify',
        secret: 'mysecret',
        headers: { 'X-Source': 'em' },
        events: ['reading.new', 'alert.created'],
        timeoutMs: 5000,
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('sends POST and returns success', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await connector.sync(
        makeIntegration({ url: 'https://hooks.example.com/notify' }),
      );

      expect(result.status).toBe('success');
      expect(result.recordsSynced).toBe(1);
      expect(result.errorMessage).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://hooks.example.com/notify');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
    });

    it('includes HMAC signature when secret is set', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const secret = 'testsecret';

      await connector.sync(
        makeIntegration({ url: 'https://hooks.example.com', secret }),
      );

      const [, init] = mockFetch.mock.calls[0];
      const body = init.body;
      const expectedSig = createHmac('sha256', secret).update(body).digest('hex');
      expect(init.headers['X-Webhook-Signature']).toBe(expectedSig);
    });

    it('includes custom headers', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await connector.sync(
        makeIntegration({
          url: 'https://hooks.example.com',
          headers: { 'X-Source': 'energy-monitor' },
        }),
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['X-Source']).toBe('energy-monitor');
    });

    it('returns failed on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const result = await connector.sync(
        makeIntegration({ url: 'https://hooks.example.com' }),
      );

      expect(result.status).toBe('failed');
      expect(result.recordsSynced).toBe(0);
      expect(result.errorMessage).toContain('503');
    });

    it('retries on failure and returns failed after all retries', async () => {
      mockFetch.mockRejectedValue(new Error('connection reset'));

      const result = await connector.sync(
        makeIntegration({ url: 'https://hooks.example.com', timeoutMs: 1000 }),
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('connection reset');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('sends payload with integration id and timestamp', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await connector.sync(
        makeIntegration({ url: 'https://hooks.example.com' }),
      );

      const [, init] = mockFetch.mock.calls[0];
      const payload = JSON.parse(init.body);
      expect(payload.event).toBe('sync.test');
      expect(payload.integrationId).toBe('int-2');
      expect(payload.timestamp).toBeDefined();
    });
  });
});
