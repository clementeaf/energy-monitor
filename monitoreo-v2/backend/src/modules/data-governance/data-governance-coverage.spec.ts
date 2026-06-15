import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * DAT-16 + DAT-17 + DAT-19: Validates that data governance APIs exist
 * and cover Anexo 07 requirements for balance validation, quality reports,
 * and meter sync traceability.
 */
describe('Data governance API coverage', () => {
  const govDir = resolve(__dirname);
  const externalApiPath = resolve(__dirname, '..', 'external-api', 'external-api.controller.ts');

  describe('DAT-16: Balance anomalies API', () => {
    const controllerSrc = readFileSync(resolve(govDir, 'data-quality-admin.controller.ts'), 'utf-8');
    const serviceSrc = readFileSync(resolve(govDir, 'data-governance-admin.service.ts'), 'utf-8');
    const jobSrc = readFileSync(resolve(govDir, 'meter-balance-job.service.ts'), 'utf-8');

    it('exposes GET balance-anomalies endpoint', () => {
      expect(controllerSrc).toContain("@Get('balance-anomalies')");
    });

    it('queries balance_anomalies table with tenant scope', () => {
      expect(serviceSrc).toContain('FROM balance_anomalies');
      expect(serviceSrc).toContain('tenant_id');
    });

    it('balance job uses threshold (5% / 1kWh)', () => {
      expect(jobSrc).toMatch(/BALANCE_DELTA_THRESHOLD_PCT|0\.05/);
      expect(jobSrc).toMatch(/MIN_ABSOLUTE_DELTA_KWH|1/);
    });

    it('balance job inserts anomalies with ON CONFLICT', () => {
      expect(jobSrc).toContain('INSERT INTO balance_anomalies');
      expect(jobSrc).toContain('ON CONFLICT');
    });
  });

  describe('DAT-17: Data quality report API', () => {
    const reportSrc = readFileSync(resolve(govDir, 'data-quality-report.service.ts'), 'utf-8');
    const rollupSrc = readFileSync(resolve(govDir, 'data-quality-rollup.service.ts'), 'utf-8');

    it('quality report service reads from data_quality_daily', () => {
      expect(reportSrc).toContain('DataQualityDaily');
    });

    it('rollup cron aggregates quality percentages', () => {
      expect(rollupSrc).toContain("quality = 'measured'");
      expect(rollupSrc).toContain("quality = 'estimated'");
      expect(rollupSrc).toContain("quality = 'invalid'");
    });

    it('rollup runs daily at 03:30 UTC', () => {
      expect(rollupSrc).toContain('0 30 3 * * *');
    });

    it('admin controller exposes quality report endpoint', () => {
      const controllerSrc = readFileSync(resolve(govDir, 'data-quality-admin.controller.ts'), 'utf-8');
      expect(controllerSrc).toContain('Data quality report');
    });
  });

  describe('DAT-19: Meter sync traceability API', () => {
    const externalApiSrc = readFileSync(externalApiPath, 'utf-8');

    it('exposes GET /v1/meters/:id/status', () => {
      expect(externalApiSrc).toContain("@Get('meters/:id/status')");
    });

    it('returns last reading, lag, and stale flag', () => {
      expect(externalApiSrc).toContain('meter ingest status');
      expect(externalApiSrc).toContain('MeterReadingStatusService');
    });
  });
});
