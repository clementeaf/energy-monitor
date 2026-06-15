import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-kpi-rules', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-kpi-rules.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-kpi-rules-test.md');

  let markdown: string;

  beforeAll(() => {
    execSync(`node ${scriptPath} --output ${tmpOutput}`, { timeout: 15_000 });
    markdown = readFileSync(tmpOutput, 'utf-8');
  });

  afterAll(() => {
    try { unlinkSync(tmpOutput); } catch { /* noop */ }
  });

  it('generates non-empty output', () => {
    expect(markdown.length).toBeGreaterThan(3000);
  });

  it('verifies at least 9 formulas against source', () => {
    const match = markdown.match(/(\d+) formulas verified/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(9);
  });

  it('documents time bucketing intervals', () => {
    const intervals = ['5 minutes', '15 minutes', '1 hour', '1 day', '1 month'];
    for (const interval of intervals) {
      expect(markdown).toContain(interval);
    }
  });

  it('documents per-bucket aggregation formulas', () => {
    expect(markdown).toContain('AVG(power_kw)');
    expect(markdown).toContain('MAX(power_kw)');
    expect(markdown).toContain('MAX(energy_kwh_total) - MIN(energy_kwh_total)');
  });

  it('documents weighted average for re-bucketing', () => {
    expect(markdown).toContain('SUM(daily_avg * daily_count) / SUM(daily_count)');
  });

  it('documents invoice energy calculation with interval factor', () => {
    expect(markdown).toContain('power_kw × 0.25');
    expect(markdown).toContain('15 min / 60 min');
  });

  it('documents tariff block structure', () => {
    expect(markdown).toContain('energyRate');
    expect(markdown).toContain('demandRate');
    expect(markdown).toContain('reactiveRate');
    expect(markdown).toContain('fixedCharge');
  });

  it('documents invoice total with tax rate', () => {
    expect(markdown).toContain('0.19');
    expect(markdown).toContain('19% IVA');
  });

  it('documents all electrical alert types', () => {
    const alerts = [
      'VOLTAGE_OUT_OF_RANGE', 'LOW_POWER_FACTOR', 'HIGH_THD',
      'PHASE_IMBALANCE', 'FREQUENCY_OUT_OF_RANGE', 'OVERCURRENT',
      'BREAKER_TRIP', 'NEUTRAL_FAULT',
    ];
    for (const alert of alerts) {
      expect(markdown).toContain(alert);
    }
  });

  it('documents consumption alert types', () => {
    expect(markdown).toContain('PEAK_DEMAND_EXCEEDED');
    expect(markdown).toContain('ABNORMAL_CONSUMPTION');
    expect(markdown).toContain('ENERGY_DEVIATION');
  });

  it('documents unit conversions', () => {
    expect(markdown).toContain('×0.001');
    expect(markdown).toContain('W');
    expect(markdown).toContain('kW');
    expect(markdown).toContain('kWh');
  });

  it('documents meter balance validation', () => {
    expect(markdown).toContain('parent_kwh');
    expect(markdown).toContain('child_kwh');
    expect(markdown).toContain('5%');
    expect(markdown).toContain('1 kWh');
  });

  it('documents data quality enum', () => {
    const qualities = ['measured', 'estimated', 'invalid', 'unknown'];
    for (const q of qualities) {
      expect(markdown).toContain(`\`${q}\``);
    }
  });

  it('documents reading sources', () => {
    const sources = ['modbus', 'mqtt', 'api_ingress', 'backfill', 'drive_pipeline'];
    for (const s of sources) {
      expect(markdown).toContain(`\`${s}\``);
    }
  });

  it('covers all 7 sections', () => {
    const sections = [
      'Readings Aggregation',
      'Invoice Generation',
      'Alert Thresholds',
      'Unit Conversions',
      'Meter Balance',
      'Data Quality',
      'Reading Sources',
    ];
    for (const section of sections) {
      expect(markdown).toContain(section);
    }
  });
});
