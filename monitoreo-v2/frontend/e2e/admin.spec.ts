import { test, expect } from '@playwright/test';
import { injectAuth } from './helpers';

test.describe('Admin — Companies', () => {
  test('lists tenants', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/admin/companies');
    await expect(page.locator('text=Globe Power').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=PASA').first()).toBeVisible();
    await expect(page.locator('text=Siemens').first()).toBeVisible();
  });
});

test.describe('Admin — Audit', () => {
  test('loads audit log', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/admin/audit');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Privacy — public', () => {
  test('privacy policy loads without auth', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://power-monitor.cloud/privacy-policy');
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 10000 });
    await context.close();
  });
});
