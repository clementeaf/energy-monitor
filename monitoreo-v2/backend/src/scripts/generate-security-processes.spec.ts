import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-security-processes', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-security-processes.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-security-processes-test.md');

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

  it('contains all 5 sections', () => {
    expect(markdown).toContain('Antivirus / EDR Justification (CYB-14)');
    expect(markdown).toContain('Patching SLA (CYB-18)');
    expect(markdown).toContain('Privileged Account Review (CYB-20)');
    expect(markdown).toContain('Backup Integrity Test (CYB-23)');
    expect(markdown).toContain('Schema Change Notification (DAT-13b)');
  });

  it('CYB-14: documents Fargate compensating controls', () => {
    expect(markdown).toContain('Fargate');
    expect(markdown).toContain('Immutable images');
    expect(markdown).toContain('ECR scan');
    expect(markdown).toContain('Firecracker');
  });

  it('CYB-18: defines patching SLA by severity', () => {
    expect(markdown).toContain('7 days');
    expect(markdown).toContain('14 days');
    expect(markdown).toContain('30 days');
    expect(markdown).toContain('CVSS');
  });

  it('CYB-20: includes monthly review checklist', () => {
    expect(markdown).toContain('super_admin');
    expect(markdown).toContain('Monthly');
    expect(markdown).toContain('mfa_enabled');
  });

  it('CYB-23: includes backup restore procedure', () => {
    expect(markdown).toContain('Restore snapshot');
    expect(markdown).toContain('Semestral');
    expect(markdown).toContain('row counts');
    expect(markdown).toContain('RPO');
  });

  it('DAT-13b: includes 30-day notification process', () => {
    expect(markdown).toContain('T-30 days');
    expect(markdown).toContain('Notification Template');
    expect(markdown).toContain('Backward Compatibility');
  });

  it('references all Anexo 07 IDs', () => {
    const ids = ['CYB-14', 'CYB-18', 'CYB-20', 'CYB-23', 'DAT-13b'];
    for (const id of ids) {
      expect(markdown).toContain(id);
    }
  });
});
