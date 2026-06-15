import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-data-catalog', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-data-catalog.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-data-catalog-test.md');

  let markdown: string;

  beforeAll(() => {
    execSync(`node ${scriptPath} --output ${tmpOutput}`, { timeout: 15_000 });
    markdown = readFileSync(tmpOutput, 'utf-8');
  });

  afterAll(() => {
    try { unlinkSync(tmpOutput); } catch { /* noop */ }
  });

  it('generates non-empty output', () => {
    expect(markdown.length).toBeGreaterThan(5000);
  });

  it('catalogs at least 50 tables', () => {
    const match = markdown.match(/(\d+) tables/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(50);
  });

  it('catalogs at least 500 columns', () => {
    const match = markdown.match(/(\d+) columns/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(500);
  });

  it('includes core tables', () => {
    const expected = ['readings', 'meters', 'buildings', 'tenants', 'users', 'invoices'];
    for (const table of expected) {
      expect(markdown).toContain(`## ${table}`);
    }
  });

  it('readings table has unit metadata', () => {
    const readingsSection = markdown.split('## readings')[1]?.split('\n## ')[0] ?? '';
    expect(readingsSection).toContain('| kW |');
    expect(readingsSection).toContain('| kWh |');
    expect(readingsSection).toContain('| V |');
    expect(readingsSection).toContain('| A |');
    expect(readingsSection).toContain('| Hz |');
  });

  it('every column row has type and nullable', () => {
    const dataRows = markdown.split('\n').filter(
      l => l.startsWith('| `') && l.includes('|'),
    );
    expect(dataRows.length).toBeGreaterThanOrEqual(500);
    for (const row of dataRows) {
      const cols = row.split('|').map(c => c.trim());
      expect(cols[2].length).toBeGreaterThan(0); // type
      expect(['Yes', 'No']).toContain(cols[3]); // nullable
    }
  });

  it('includes quality enum description', () => {
    expect(markdown).toContain('measured, estimated, invalid, unknown');
  });

  it('includes source enum description', () => {
    expect(markdown).toContain('manual_cnr');
  });

  it('references Anexo 07 DAT-05', () => {
    expect(markdown).toContain('DAT-05');
  });
});
