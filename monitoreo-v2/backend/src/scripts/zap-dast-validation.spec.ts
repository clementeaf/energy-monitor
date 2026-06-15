import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('zap-dast.yml validation', () => {
  const workflowPath = resolve(__dirname, '..', '..', '..', '..', '.github', 'workflows', 'zap-dast.yml');
  const rulesPath = resolve(__dirname, '..', '..', '..', '..', '.github', 'zap-rules.tsv');
  const workflow = readFileSync(workflowPath, 'utf-8');
  const rules = readFileSync(rulesPath, 'utf-8');

  describe('workflow structure', () => {
    it('has correct workflow name', () => {
      expect(workflow).toContain('name: OWASP ZAP DAST Scan');
    });

    it('runs on weekly schedule and manual dispatch', () => {
      expect(workflow).toContain('schedule:');
      expect(workflow).toContain('workflow_dispatch:');
    });

    it('uses TimescaleDB service container', () => {
      expect(workflow).toContain('timescale/timescaledb');
      expect(workflow).toContain('pg_isready');
    });

    it('installs backend and starts API', () => {
      expect(workflow).toContain('npm ci');
      expect(workflow).toContain('npm run start:dev');
      expect(workflow).toContain('curl -sf http://localhost:4000/api/health');
    });

    it('uses official ZAP baseline action', () => {
      expect(workflow).toContain('zaproxy/action-baseline');
    });

    it('targets the API endpoint', () => {
      expect(workflow).toContain('http://localhost:4000/api');
    });

    it('references zap-rules.tsv for tuning', () => {
      expect(workflow).toContain('zap-rules.tsv');
    });

    it('uploads HTML and JSON reports as artifacts', () => {
      expect(workflow).toContain('report_html.html');
      expect(workflow).toContain('report_json.json');
      expect(workflow).toContain('actions/upload-artifact');
    });

    it('sets 30-minute timeout', () => {
      expect(workflow).toContain('timeout-minutes: 30');
    });

    it('applies database migrations before scan', () => {
      expect(workflow).toContain('migrations/*.sql');
    });

    it('uses minimal permissions', () => {
      expect(workflow).toContain('contents: read');
    });
  });

  describe('zap-rules.tsv', () => {
    it('is non-empty', () => {
      expect(rules.length).toBeGreaterThan(50);
    });

    it('contains rule entries with ID and action', () => {
      const lines = rules.split('\n').filter(l => l.trim().length > 0);
      expect(lines.length).toBeGreaterThanOrEqual(5);
      for (const line of lines) {
        expect(line).toMatch(/^\d+\t(WARN|IGNORE|FAIL)/);
      }
    });

    it('ignores cache-control for API responses', () => {
      expect(rules).toContain('10015\tIGNORE');
    });
  });
});
