import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('generate-sbom', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'generate-sbom.mjs');
  const tmpJson = resolve(__dirname, '..', '..', 'tmp-sbom-test.json');
  const tmpMd = resolve(__dirname, '..', '..', 'tmp-sbom-test.md');

  let sbom: any;
  let markdown: string;

  beforeAll(() => {
    execSync(
      `node ${scriptPath} --output-json ${tmpJson} --output-md ${tmpMd}`,
      { timeout: 15_000 },
    );
    sbom = JSON.parse(readFileSync(tmpJson, 'utf-8'));
    markdown = readFileSync(tmpMd, 'utf-8');
  });

  afterAll(() => {
    try { unlinkSync(tmpJson); } catch { /* noop */ }
    try { unlinkSync(tmpMd); } catch { /* noop */ }
  });

  describe('CycloneDX JSON', () => {
    it('uses CycloneDX format and spec 1.5', () => {
      expect(sbom.bomFormat).toBe('CycloneDX');
      expect(sbom.specVersion).toBe('1.5');
    });

    it('has metadata with tool and component', () => {
      expect(sbom.metadata.tools[0].name).toBe('generate-sbom.mjs');
      expect(sbom.metadata.component.name).toBe('energy-monitor-v2');
    });

    it('includes at least 80 components', () => {
      expect(sbom.components.length).toBeGreaterThanOrEqual(80);
    });

    it('every component has name, version, type, and scope', () => {
      for (const c of sbom.components) {
        expect(c.type).toBe('library');
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.version.length).toBeGreaterThan(0);
        expect(['required', 'optional']).toContain(c.scope);
      }
    });

    it('includes backend and frontend components', () => {
      const backendComponents = sbom.components.filter(
        (c: any) => c.properties?.some((p: any) => p.value === 'backend'),
      );
      const frontendComponents = sbom.components.filter(
        (c: any) => c.properties?.some((p: any) => p.value === 'frontend'),
      );
      expect(backendComponents.length).toBeGreaterThanOrEqual(30);
      expect(frontendComponents.length).toBeGreaterThanOrEqual(15);
    });

    it('includes key dependencies', () => {
      const names = sbom.components.map((c: any) => c.name);
      expect(names).toContain('@nestjs/core');
      expect(names).toContain('react');
      expect(names).toContain('typeorm');
    });
  });

  describe('Summary Markdown', () => {
    it('generates non-empty output', () => {
      expect(markdown.length).toBeGreaterThan(500);
    });

    it('contains overview table', () => {
      expect(markdown).toContain('| Backend |');
      expect(markdown).toContain('| Frontend |');
      expect(markdown).toContain('| **Total**');
    });

    it('lists backend runtime dependencies', () => {
      expect(markdown).toContain('## Backend Runtime Dependencies');
      expect(markdown).toContain('@nestjs/core');
    });

    it('lists frontend runtime dependencies', () => {
      expect(markdown).toContain('## Frontend Runtime Dependencies');
      expect(markdown).toContain('react');
    });
  });
});
