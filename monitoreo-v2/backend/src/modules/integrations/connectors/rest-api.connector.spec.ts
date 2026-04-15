import { RestApiConnector } from './rest-api.connector';
import type { Integration } from '../../platform/entities/integration.entity';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeIntegration(config: Record<string, unknown>): Integration {
  return {
    id: 'int-1',
    tenantId: 't-1',
    name: 'Test REST',
    integrationType: 'rest_api',
    status: 'active',
    config,
    lastSyncAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Integration;
}

describe('RestApiConnector', () => {
  let connector: RestApiConnector;

  beforeEach(() => {
    connector = new RestApiConnector();
    mockFetch.mockReset();
  });

  describe('validateConfig', () => {
    it('requires url', () => {
      const errors = connector.validateConfig({});
      expect(errors).toContain('url is required and must be a string');
    });

    it('rejects invalid url', () => {
      const errors = connector.validateConfig({ url: 'not-a-url' });
      expect(errors).toContain('Invalid URL format');
    });

    it('rejects SSRF targeting localhost', () => {
      const errors = connector.validateConfig({ url: 'http://127.0.0.1/admin' });
      expect(errors.some((e) => e.includes('Blocked'))).toBe(true);
    });

    it('rejects SSRF targeting AWS metadata', () => {
      const errors = connector.validateConfig({ url: 'http://169.254.169.254/latest/' });
      expect(errors.some((e) => e.includes('Blocked'))).toBe(true);
    });

    it('accepts valid minimal config', () => {
      const errors = connector.validateConfig({ url: 'https://api.example.com/data' });
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid method', () => {
      const errors = connector.validateConfig({ url: 'https://x.com', method: 'DELETE' });
      expect(errors).toContain('method must be GET or POST');
    });

    it('rejects non-object headers', () => {
      const errors = connector.validateConfig({ url: 'https://x.com', headers: 'bad' });
      expect(errors).toContain('headers must be a key-value object');
    });

    it('validates bearer auth requires token', () => {
      const errors = connector.validateConfig({
        url: 'https://x.com',
        auth: { type: 'bearer' },
      });
      expect(errors).toContain('auth.token is required for bearer auth');
    });

    it('validates basic auth requires username and password', () => {
      const errors = connector.validateConfig({
        url: 'https://x.com',
        auth: { type: 'basic', username: 'u' },
      });
      expect(errors).toContain('auth.username and auth.password are required for basic auth');
    });

    it('validates api_key auth requires apiKey', () => {
      const errors = connector.validateConfig({
        url: 'https://x.com',
        auth: { type: 'api_key' },
      });
      expect(errors).toContain('auth.apiKey is required for api_key auth');
    });

    it('rejects invalid auth type', () => {
      const errors = connector.validateConfig({
        url: 'https://x.com',
        auth: { type: 'oauth' },
      });
      expect(errors[0]).toContain('auth.type must be one of');
    });

    it('rejects timeoutMs < 1000', () => {
      const errors = connector.validateConfig({ url: 'https://x.com', timeoutMs: 500 });
      expect(errors).toContain('timeoutMs must be a number >= 1000');
    });

    it('accepts full valid config', () => {
      const errors = connector.validateConfig({
        url: 'https://api.example.com/readings',
        method: 'POST',
        headers: { 'X-Custom': 'val' },
        auth: { type: 'bearer', token: 'abc123' },
        body: { query: 'latest' },
        responseMapping: { dataPath: 'data.items', countPath: 'meta.total' },
        timeoutMs: 5000,
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('returns success with array response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }]),
      });

      const result = await connector.sync(
        makeIntegration({ url: 'https://api.example.com/data' }),
      );

      expect(result.status).toBe('success');
      expect(result.recordsSynced).toBe(3);
      expect(result.errorMessage).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('uses responseMapping.dataPath to extract records', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { items: [1, 2, 3, 4, 5] }, meta: { total: 100 } }),
      });

      const result = await connector.sync(
        makeIntegration({
          url: 'https://api.example.com',
          responseMapping: { dataPath: 'data.items' },
        }),
      );

      expect(result.recordsSynced).toBe(5);
    });

    it('uses responseMapping.countPath for record count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: { total: 42 } }),
      });

      const result = await connector.sync(
        makeIntegration({
          url: 'https://api.example.com',
          responseMapping: { countPath: 'meta.total' },
        }),
      );

      expect(result.recordsSynced).toBe(42);
    });

    it('applies bearer auth header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await connector.sync(
        makeIntegration({
          url: 'https://api.example.com',
          auth: { type: 'bearer', token: 'mytoken' },
        }),
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBe('Bearer mytoken');
    });

    it('applies basic auth header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await connector.sync(
        makeIntegration({
          url: 'https://api.example.com',
          auth: { type: 'basic', username: 'user', password: 'pass' },
        }),
      );

      const [, init] = mockFetch.mock.calls[0];
      const expected = `Basic ${Buffer.from('user:pass').toString('base64')}`;
      expect(init.headers['Authorization']).toBe(expected);
    });

    it('applies api_key auth with custom header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await connector.sync(
        makeIntegration({
          url: 'https://api.example.com',
          auth: { type: 'api_key', apiKey: 'key123', headerName: 'X-Token' },
        }),
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['X-Token']).toBe('key123');
    });

    it('sends POST with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 1 }),
      });

      await connector.sync(
        makeIntegration({
          url: 'https://api.example.com',
          method: 'POST',
          body: { query: 'test' },
        }),
      );

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ query: 'test' }));
    });

    it('returns failed on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await connector.sync(
        makeIntegration({ url: 'https://api.example.com' }),
      );

      expect(result.status).toBe('failed');
      expect(result.recordsSynced).toBe(0);
      expect(result.errorMessage).toContain('500');
    });

    it('returns failed on network error after retries', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await connector.sync(
        makeIntegration({ url: 'https://api.example.com', timeoutMs: 1000 }),
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('ECONNREFUSED');
      // 3 attempts: 1 initial + 2 retries
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('returns 1 for non-array response without mapping', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: 42 }),
      });

      const result = await connector.sync(
        makeIntegration({ url: 'https://api.example.com' }),
      );

      expect(result.recordsSynced).toBe(1);
    });
  });
});
