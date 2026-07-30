import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/auth.setup.ts'],
  timeout: 15000,
  retries: 0,
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'https://power-monitor.cloud',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
