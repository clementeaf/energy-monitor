import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-protocol-mapping', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-protocol-mapping.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-protocol-mapping-test.md');

  let markdown: string;

  beforeAll(() => {
    execSync(`node ${scriptPath} --output ${tmpOutput}`, { timeout: 15_000 });
    markdown = readFileSync(tmpOutput, 'utf-8');
  });

  afterAll(() => {
    try { unlinkSync(tmpOutput); } catch { /* noop */ }
  });

  it('generates non-empty output', () => {
    expect(markdown.length).toBeGreaterThan(1000);
  });

  it('lists all supported protocols', () => {
    const expected = ['modbus', 'mqtt', 'bacnet', 'snmp', 'api'];
    for (const proto of expected) {
      expect(markdown).toContain(`\`${proto}\``);
    }
  });

  it('includes Siemens POC3000 variable mapping table', () => {
    expect(markdown).toContain('Siemens POC3000');
    expect(markdown).toContain('| IoT Variable (register_key)');
  });

  it('maps all 14 Siemens variables', () => {
    const variableSection = markdown.split('Variable Mapping')[1]?.split('### Transformation')[0] ?? '';
    const dataRows = variableSection.split('\n').filter(l => l.startsWith('| `'));
    expect(dataRows.length).toBe(14);
  });

  it('documents scale factor transformations', () => {
    expect(markdown).toContain('0.001');
    expect(markdown).toContain('W→kW');
  });

  it('lists all reading target fields', () => {
    const expectedFields = [
      'power_kw', 'voltage_l1', 'current_l1', 'energy_kwh_total',
      'power_factor', 'frequency_hz', 'thd_voltage_pct',
    ];
    for (const field of expectedFields) {
      expect(markdown).toContain(`\`${field}\``);
    }
  });

  it('documents data quality classification', () => {
    expect(markdown).toContain('Data Quality Classification');
    const qualities = ['measured', 'estimated', 'invalid', 'unknown'];
    for (const q of qualities) {
      expect(markdown).toContain(`\`${q}\``);
    }
  });

  it('documents IoT quality → reading quality mapping', () => {
    expect(markdown).toContain('mapIotQualityToReadingQuality');
    expect(markdown).toContain('Good / measured');
  });

  it('lists all reading sources', () => {
    const sources = ['modbus', 'mqtt', 'api_ingress', 'backfill', 'synthetic', 'drive_pipeline'];
    for (const s of sources) {
      expect(markdown).toContain(`\`${s}\``);
    }
  });

  it('documents register_mappings model', () => {
    expect(markdown).toContain('register_mappings {');
    expect(markdown).toContain('scale_factor');
    expect(markdown).toContain('target_field');
  });

  it('includes transformation pipeline diagram', () => {
    expect(markdown).toContain('NormalizationService.apply');
    expect(markdown).toContain('coerceNumber');
  });
});
