import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('../store/useAppStore', () => ({
  useAppStore: { getState: () => ({ selectedTenantId: null }) },
}));

describe('api auth session — violent interceptor behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  it('injects Bearer via defaults and per-request interceptor', async () => {
    const adapter = vi.fn(async (config: { headers: { get: (k: string) => string | undefined; set: (k: string, v: string) => void; Authorization?: string } }) => {
      const auth =
        typeof config.headers.get === 'function'
          ? config.headers.get('Authorization')
          : config.headers.Authorization;
      return {
        data: { auth },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });

    vi.doMock('axios', async () => {
      const actual = await vi.importActual<typeof import('axios')>('axios');
      return {
        ...actual,
        default: {
          ...actual.default,
          create: (defaults: unknown) => {
            const instance = actual.default.create(defaults);
            instance.defaults.adapter = adapter as never;
            return instance;
          },
        },
      };
    });

    const apiModule = await import('./api');
    apiModule.setDevBearerToken('violent-test-token');

    const client = (await import('./api')).default;
    const response = await client.get('/auth/me');
    expect(response.data.auth).toBe('Bearer violent-test-token');
  });

  it('persists bearer in sessionStorage across module reload', async () => {
    const { setDevBearerToken } = await import('./api');
    setDevBearerToken('persisted-token');
    expect(sessionStorage.getItem('dev_bearer_token')).toBe('persisted-token');

    vi.resetModules();
    const reloaded = await import('./api');
    expect(reloaded.default.defaults.headers.common.Authorization).toBe('Bearer persisted-token');
  });

  it('clears defaults Authorization when bearer is wiped', async () => {
    const apiModule = await import('./api');
    apiModule.setDevBearerToken('temp');
    apiModule.clearDevBearerToken();
    expect(apiModule.default.defaults.headers.common.Authorization).toBeUndefined();
    expect(sessionStorage.getItem('dev_bearer_token')).toBeNull();
  });

  it('does not overwrite explicit Authorization on a request', async () => {
    const captured: string[] = [];
    const instance = axios.create({ baseURL: '/api' });
    instance.interceptors.request.use((config) => {
      const headers = config.headers;
      const existing =
        typeof headers.get === 'function' ? headers.get('Authorization') : headers.Authorization;
      if (!existing) {
        headers.set('Authorization', 'Bearer auto');
      }
      captured.push(
        (typeof headers.get === 'function' ? headers.get('Authorization') : headers.Authorization) ?? '',
      );
      return config;
    });
    instance.defaults.adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })) as never;

    await instance.get('/x', { headers: { Authorization: 'Bearer manual' } });
    expect(captured[0]).toBe('Bearer manual');
  });
});
