import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-er-diagram', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-er-diagram.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-er-test.md');

  let markdown: string;

  beforeAll(() => {
    execSync(`node ${scriptPath} --output ${tmpOutput}`, { timeout: 15_000 });
    markdown = readFileSync(tmpOutput, 'utf-8');
  });

  afterAll(() => {
    try { unlinkSync(tmpOutput); } catch { /* noop */ }
  });

  it('generates non-empty output', () => {
    expect(markdown.length).toBeGreaterThan(500);
  });

  it('wraps content in mermaid code fence', () => {
    expect(markdown).toContain('```mermaid');
    expect(markdown).toContain('erDiagram');
  });

  it('includes core tables', () => {
    const expected = [
      'tenants', 'users', 'buildings', 'meters', 'readings',
      'roles', 'alerts', 'alert_rules', 'invoices', 'tariffs',
      'refresh_tokens',
    ];
    for (const table of expected) {
      expect(markdown).toContain(`${table} {`);
    }
  });

  it('includes FK relations with valid syntax', () => {
    const lines = markdown.split('\n').filter(l => l.includes('}o--||'));
    expect(lines.length).toBeGreaterThanOrEqual(90);
    for (const line of lines) {
      expect(line).toMatch(/\w+ \}o--\|\| \w+ : "\w+"/);
    }
  });

  it('every table block has a PK', () => {
    const blocks = markdown.split(/\n    \w+ \{/).slice(1);
    expect(blocks.length).toBeGreaterThanOrEqual(50);
    for (const block of blocks) {
      expect(block).toContain(' PK');
    }
  });

  it('readings table has quality enum', () => {
    expect(markdown).toMatch(/readings \{[\s\S]*?enum\(measured,estimated,invalid,unknown\) quality/);
  });

  it('refresh_tokens table has last_activity_at', () => {
    expect(markdown).toMatch(/refresh_tokens \{[\s\S]*?last_activity_at/);
  });

  it('reports entity count in header', () => {
    const match = markdown.match(/from (\d+) TypeORM entities/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(50);
  });

  it('reports relation count in header', () => {
    const match = markdown.match(/(\d+) foreign key relations/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(90);
  });
});
