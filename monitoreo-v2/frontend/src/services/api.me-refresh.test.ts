import { describe, expect, it, vi } from 'vitest';

vi.mock('../store/useAppStore', () => ({
  useAppStore: { getState: () => ({ selectedTenantId: null }) },
}));

describe('api session refresh on /auth/me', () => {
  it('refreshes an expired access token and retries /auth/me instead of failing', async () => {
    const calls: string[] = [];
    let isAccessTokenFresh = false;
    const adapter = vi.fn(async (config: { url?: string }) => {
      const url = config.url ?? '';
      calls.push(url);
      if (url.includes('/auth/refresh')) {
        isAccessTokenFresh = true;
        return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
      }
      if (!isAccessTokenFresh) {
        return Promise.reject(Object.assign(new Error('Unauthorized'), { config, response: { status: 401, data: {}, config } }));
      }
      return { data: { user: { id: 'u-1' } }, status: 200, statusText: 'OK', headers: {}, config };
    });

    const api = (await import('./api')).default;
    api.defaults.adapter = adapter as never;

    const response = await api.get('/auth/me');

    expect(response.data.user.id).toBe('u-1');
    expect(calls).toEqual(['/auth/me', '/auth/refresh', '/auth/me']);
  });
});
