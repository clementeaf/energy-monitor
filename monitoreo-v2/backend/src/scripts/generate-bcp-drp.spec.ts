import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-bcp-drp', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-bcp-drp.mjs');
  const tmpOutput = resolve(__dirname, '..', '..', 'tmp-bcp-drp-test.md');

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

  it('contains all 5 sections', () => {
    const sections = [
      'Infrastructure Components',
      'Component Recovery Details',
      'Disaster Recovery Scenarios',
      'Communication Plan',
      'Testing Schedule',
    ];
    for (const section of sections) {
      expect(markdown).toContain(section);
    }
  });

  it('lists at least 8 infrastructure components', () => {
    const match = markdown.match(/(\d+) components/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(8);
  });

  it('includes critical components: ECS, RDS, API Gateway', () => {
    expect(markdown).toContain('ECS Fargate');
    expect(markdown).toContain('RDS PostgreSQL');
    expect(markdown).toContain('API Gateway');
  });

  it('every component has RTO and RPO', () => {
    const detailSections = markdown.split('### ').slice(1);
    const componentSections = detailSections.filter(s => s.includes('**RTO**'));
    expect(componentSections.length).toBeGreaterThanOrEqual(8);
    for (const section of componentSections) {
      expect(section).toContain('**RPO**');
    }
  });

  it('RDS RTO is under 4 hours (ARQ-11)', () => {
    expect(markdown).toMatch(/RDS PostgreSQL[\s\S]*?\| \*\*RTO\*\* \| < 4 hours/);
  });

  it('lists at least 6 recovery scenarios', () => {
    const match = markdown.match(/(\d+) recovery scenarios/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(6);
  });

  it('includes database failure scenario', () => {
    expect(markdown).toContain('Database failure');
    expect(markdown).toContain('restore from');
  });

  it('includes security breach scenario', () => {
    expect(markdown).toContain('Security breach');
    expect(markdown).toContain('Rotate JWT_SECRET');
    expect(markdown).toContain('72h');
  });

  it('includes communication plan with SLAs', () => {
    expect(markdown).toContain('< 24h');
    expect(markdown).toContain('< 72h');
    expect(markdown).toContain('Ley 21.719');
  });

  it('includes testing schedule', () => {
    expect(markdown).toContain('Quarterly');
    expect(markdown).toContain('Monthly');
    expect(markdown).toContain('Annually');
  });

  it('references Anexo 07 requirements', () => {
    expect(markdown).toContain('CYB-11');
    expect(markdown).toContain('ARQ-11');
  });
});
