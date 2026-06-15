import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-api-operations-docs', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-api-operations-docs.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-api-ops-test.md');

  let markdown: string;

  beforeAll(() => {
    execSync(`node ${scriptPath} --output ${tmpOutput}`, { timeout: 15_000 });
    markdown = readFileSync(tmpOutput, 'utf-8');
  });

  afterAll(() => {
    try { unlinkSync(tmpOutput); } catch { /* noop */ }
  });

  it('generates non-empty output', () => {
    expect(markdown.length).toBeGreaterThan(2000);
  });

  it('contains all 3 sections', () => {
    expect(markdown).toContain('Rate Limiting (DAT-15)');
    expect(markdown).toContain('Incremental Data Loading (DAT-21)');
    expect(markdown).toContain('Stale Data Alerts (DAT-24)');
  });

  /* DAT-15 */
  it('documents rate limit tiers', () => {
    expect(markdown).toContain('| Tier |');
    expect(markdown).toContain('req |');
  });

  it('documents API key rate limits', () => {
    expect(markdown).toContain('rate_limit_per_minute');
    expect(markdown).toContain('429');
  });

  it('includes ETL recommendations', () => {
    expect(markdown).toContain('exponential backoff');
    expect(markdown).toContain('incremental loading');
  });

  /* DAT-21 */
  it('documents date range cursor pattern', () => {
    expect(markdown).toContain('from=');
    expect(markdown).toContain('to=');
    expect(markdown).toContain('watermark');
  });

  it('documents bulk export flow', () => {
    expect(markdown).toContain('POST /api/v1/exports');
    expect(markdown).toContain('download');
  });

  it('documents latest-anchor endpoint', () => {
    expect(markdown).toContain('latest-anchor');
  });

  /* DAT-24 */
  it('documents stale threshold default (4h)', () => {
    expect(markdown).toContain('4h');
  });

  it('documents configurable range', () => {
    expect(markdown).toContain('staleThresholdHours');
    expect(markdown).toContain('1h');
    expect(markdown).toContain('72h');
  });

  it('documents METER_OFFLINE alert', () => {
    expect(markdown).toContain('METER_OFFLINE');
    expect(markdown).toContain('offlineAlerts');
  });

  it('references all three Anexo 07 IDs', () => {
    expect(markdown).toContain('DAT-15');
    expect(markdown).toContain('DAT-21');
    expect(markdown).toContain('DAT-24');
  });
});
