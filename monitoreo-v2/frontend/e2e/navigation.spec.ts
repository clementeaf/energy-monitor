import { test, expect } from '@playwright/test';
import { injectAuth } from './helpers';

const pages = [
  '/',
  '/dashboard/executive',
  '/dashboard/compare',
  '/monitoring/realtime',
  '/monitoring/devices',
  '/buildings',
  '/meters',
  '/alerts',
  '/invoices',
  '/reports',
  '/admin/users',
  '/admin/companies',
  '/admin/audit',
  '/profile',
];

for (const path of pages) {
  test(`${path} loads without error`, async ({ page }) => {
    await injectAuth(page);
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#root')).not.toBeEmpty();
  });
}
