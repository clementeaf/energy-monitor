import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-error-catalog', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-error-catalog.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-error-catalog-test.md');

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

  it('contains summary table', () => {
    expect(markdown).toContain('## Summary');
    expect(markdown).toContain('| HTTP Status | Label | Count |');
  });

  it('covers all expected HTTP status codes', () => {
    const expected = [400, 401, 403, 404, 409];
    for (const code of expected) {
      expect(markdown).toContain(`## ${code}`);
    }
  });

  it('includes troubleshooting guidance per status', () => {
    expect(markdown).toContain('**Troubleshooting:**');
    // At least 5 troubleshooting sections (one per status)
    const count = (markdown.match(/\*\*Troubleshooting:\*\*/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it('includes error messages with source locations', () => {
    // Each error row has module and source file:line
    const rows = markdown.split('\n').filter(l => l.startsWith('|') && l.includes('.ts:'));
    expect(rows.length).toBeGreaterThanOrEqual(80);
  });

  it('detects auth module errors', () => {
    expect(markdown).toContain('Authentication failed.');
    expect(markdown).toContain('Invalid MFA code.');
    expect(markdown).toContain('No refresh token provided');
  });

  it('detects permission errors', () => {
    expect(markdown).toContain('Missing permission:');
    expect(markdown).toContain('Cross-tenant access denied');
  });

  it('detects idle timeout error', () => {
    expect(markdown).toContain('Session expired due to inactivity.');
  });

  it('reports unique count in header', () => {
    const match = markdown.match(/(\d+) unique/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(80);
  });

  it('reports throw count in header', () => {
    const match = markdown.match(/from (\d+) throw/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(150);
  });
});
