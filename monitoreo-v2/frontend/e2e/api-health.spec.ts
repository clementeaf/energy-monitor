import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get('/api/buildings');
    expect(res.status()).toBe(401);
  });

  test('privacy policy is public', async ({ request }) => {
    const res = await request.get('/api/privacy/policy');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.version).toBeDefined();
  });
});
