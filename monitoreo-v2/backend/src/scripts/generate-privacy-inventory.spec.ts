import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-privacy-inventory', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-privacy-inventory.mjs');
  const tmpPii = resolve(__dirname, '..', '..', 'tmp-pii-test.md');
  const tmpSub = resolve(__dirname, '..', '..', 'tmp-sub-test.md');

  let piiMarkdown: string;
  let subMarkdown: string;

  beforeAll(() => {
    execSync(
      `node ${scriptPath} --output-pii ${tmpPii} --output-sub ${tmpSub}`,
      { timeout: 15_000 },
    );
    piiMarkdown = readFileSync(tmpPii, 'utf-8');
    subMarkdown = readFileSync(tmpSub, 'utf-8');
  });

  afterAll(() => {
    try { unlinkSync(tmpPii); } catch { /* noop */ }
    try { unlinkSync(tmpSub); } catch { /* noop */ }
  });

  /* ── PRI-06: PII Field Inventory ── */

  describe('PII inventory (PRI-06)', () => {
    it('generates non-empty output', () => {
      expect(piiMarkdown.length).toBeGreaterThan(500);
    });

    it('contains summary table with three categories', () => {
      expect(piiMarkdown).toContain('| Personal |');
      expect(piiMarkdown).toContain('| Sensitive |');
      expect(piiMarkdown).toContain('| Confidential |');
    });

    it('classifies at least 20 PII fields', () => {
      const match = piiMarkdown.match(/(\d+) fields classified/);
      expect(match).toBeTruthy();
      expect(Number(match![1])).toBeGreaterThanOrEqual(20);
    });

    it('includes user email in personal data', () => {
      expect(piiMarkdown).toContain('| users | `email` | Email address |');
    });

    it('includes MFA secret in sensitive data', () => {
      expect(piiMarkdown).toContain('| users | `mfa_secret` | TOTP shared secret |');
    });

    it('includes IP address in confidential data', () => {
      expect(piiMarkdown).toContain('| refresh_tokens | `ip_address` | IP address |');
    });

    it('includes legal basis for each field', () => {
      const dataRows = piiMarkdown.split('\n').filter(
        l => l.startsWith('|') && l.includes('.entity.ts'),
      );
      expect(dataRows.length).toBeGreaterThanOrEqual(20);
      for (const row of dataRows) {
        // Each row should have a legal basis column (non-empty)
        const cols = row.split('|').map(c => c.trim());
        expect(cols[4].length).toBeGreaterThan(0); // Legal Basis column
      }
    });

    it('includes retention policy for each field', () => {
      const dataRows = piiMarkdown.split('\n').filter(
        l => l.startsWith('|') && l.includes('.entity.ts'),
      );
      for (const row of dataRows) {
        const cols = row.split('|').map(c => c.trim());
        expect(cols[5].length).toBeGreaterThan(0); // Retention column
      }
    });

    it('references Ley 21.719', () => {
      expect(piiMarkdown).toContain('Ley 21.719');
    });
  });

  /* ── PRI-07: Sub-Processors ── */

  describe('Sub-processors (PRI-07)', () => {
    it('generates non-empty output', () => {
      expect(subMarkdown.length).toBeGreaterThan(500);
    });

    it('catalogs at least 5 sub-processors', () => {
      const match = subMarkdown.match(/(\d+) sub-processors/);
      expect(match).toBeTruthy();
      expect(Number(match![1])).toBeGreaterThanOrEqual(5);
    });

    it('includes AWS as sub-processor', () => {
      expect(subMarkdown).toContain('Amazon Web Services');
      expect(subMarkdown).toContain('ECS Fargate');
    });

    it('includes Microsoft Azure AD', () => {
      expect(subMarkdown).toContain('Microsoft Azure AD');
      expect(subMarkdown).toContain('OAuth');
    });

    it('includes Google Identity', () => {
      expect(subMarkdown).toContain('Google');
      expect(subMarkdown).toContain('Sign-In');
    });

    it('each processor has purpose, country, and safeguards', () => {
      const sections = subMarkdown.split('### ').slice(1);
      expect(sections.length).toBeGreaterThanOrEqual(5);
      for (const section of sections) {
        expect(section).toContain('**Purpose**');
        expect(section).toContain('**Country / Region**');
        expect(section).toContain('**Safeguards**');
      }
    });

    it('includes data flow summary', () => {
      expect(subMarkdown).toContain('Data Flow Summary');
      expect(subMarkdown).toContain('CloudFront');
    });
  });
});
