import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-change-management', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-change-management.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-change-mgmt-test.md');

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

  it('contains all 8 sections', () => {
    const sections = [
      'Change Lifecycle',
      'Branch Strategy',
      'Pre-Merge Gates',
      'CI/CD Workflows',
      'Test Suites',
      'Deployment Process',
      'Rollback Procedure',
      'Emergency Changes',
    ];
    for (const section of sections) {
      expect(markdown).toContain(section);
    }
  });

  it('documents branch protection for main', () => {
    expect(markdown).toContain('`main`');
    expect(markdown).toContain('Requires PR');
  });

  it('lists pre-merge gates', () => {
    expect(markdown).toContain('Unit tests (backend)');
    expect(markdown).toContain('Unit tests (frontend)');
    expect(markdown).toContain('Code review');
    expect(markdown).toContain('Security review');
  });

  it('detects active CI workflows', () => {
    expect(markdown).toContain('deploy.yml');
    expect(markdown).toContain('zap-dast.yml');
    expect(markdown).toContain('Active');
  });

  it('detects test suites from package.json', () => {
    expect(markdown).toContain('Jest');
    expect(markdown).toContain('Vitest');
    expect(markdown).toContain('Configured');
  });

  it('documents deployment steps', () => {
    expect(markdown).toContain('ECR');
    expect(markdown).toContain('ECS');
    expect(markdown).toContain('CloudFront');
    expect(markdown).toContain('Smoke test');
  });

  it('documents rollback procedures', () => {
    expect(markdown).toContain('previous ECR image');
    expect(markdown).toContain('Restore RDS');
  });

  it('documents emergency change process', () => {
    expect(markdown).toContain('Hotfix');
    expect(markdown).toContain('Post-mortem');
    expect(markdown).toContain('48h');
  });

  it('references Anexo 07 CYB-15', () => {
    expect(markdown).toContain('CYB-15');
  });
});
