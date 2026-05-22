import type { Page } from '@playwright/test';

// Test token — super_admin, 24h, generated via ECS Exec.
// Regenerate when expired: see e2e/README.md
const TEST_TOKEN = process.env.E2E_TOKEN ?? '';

export async function injectAuth(page: Page) {
  if (!TEST_TOKEN) throw new Error('E2E_TOKEN env var required');

  // Navigate first to set origin, then inject cookie + localStorage
  await page.goto('https://power-monitor.cloud/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((flag) => localStorage.setItem('has_session', flag), '1');
  await page.context().addCookies([{
    name: 'access_token',
    value: TEST_TOKEN,
    domain: 'power-monitor.cloud',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
  }]);
}

/** Accept privacy policy via API to dismiss the modal */
export async function acceptPrivacy(page: Page) {
  await page.request.post('https://power-monitor.cloud/api/auth/accept-privacy', {
    headers: { Cookie: `access_token=${TEST_TOKEN}` },
  });
}
