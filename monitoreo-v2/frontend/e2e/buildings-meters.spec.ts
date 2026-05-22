import { test, expect } from '@playwright/test';
import { injectAuth } from './helpers';

test.describe('Buildings', () => {
  test('lists buildings', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/buildings');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Meters', () => {
  test('lists meters', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/meters');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Alerts', () => {
  test('lists alerts', async ({ page }) => {
    await injectAuth(page);
    await page.goto('/alerts');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  });
});
