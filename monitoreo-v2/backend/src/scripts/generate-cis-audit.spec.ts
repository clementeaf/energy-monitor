import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const SCRIPT_PATH = resolve(__dirname, '..', '..', 'scripts', 'generate-cis-audit.mjs');
const OUTPUT_PATH = resolve(__dirname, '..', '..', '..', 'docs', 'ops', 'cis-hardening-audit.md');

describe('generate-cis-audit (CYB-17)', () => {
  beforeAll(() => {
    execSync(`node "${SCRIPT_PATH}"`, { stdio: 'pipe' });
  });

  it('generates the output file', () => {
    expect(existsSync(OUTPUT_PATH)).toBe(true);
  });

  const md = (): string => readFileSync(OUTPUT_PATH, 'utf-8');

  it('includes all 5 categories', () => {
    const content = md();
    expect(content).toContain('## ECS Fargate');
    expect(content).toContain('## RDS PostgreSQL');
    expect(content).toContain('## S3');
    expect(content).toContain('## CloudFront');
    expect(content).toContain('## IAM / Access');
  });

  it('includes summary with OK and REVIEW counts', () => {
    const content = md();
    expect(content).toContain('OK');
    expect(content).toContain('REVIEW');
    expect(content).toContain('total');
  });

  it('includes remediation plan', () => {
    const content = md();
    expect(content).toContain('## Remediation Plan');
    expect(content).toContain('Medium');
  });

  it('contains CIS benchmark reference', () => {
    const content = md();
    expect(content).toContain('CIS AWS Foundations Benchmark');
    expect(content).toContain('CIS Docker Benchmark');
  });

  it('has at least 25 checks', () => {
    const content = md();
    const checkRows = content.split('\n').filter((l) => /^\| (ECS|RDS|S3|CF|IAM)-\d+/.test(l));
    expect(checkRows.length).toBeGreaterThanOrEqual(25);
  });
});
