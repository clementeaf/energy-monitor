import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const SCRIPT_PATH = resolve(__dirname, '..', '..', 'scripts', 'package-docs.mjs');

describe('package-docs script (ARQ-15)', () => {
  const script = readFileSync(SCRIPT_PATH, 'utf-8');

  it('script exists', () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('includes key documentation files', () => {
    expect(script).toContain('er-diagram.md');
    expect(script).toContain('api-error-catalog.md');
    expect(script).toContain('data-catalog.md');
    expect(script).toContain('bcp-drp.md');
    expect(script).toContain('security-processes.md');
    expect(script).toContain('postman-collection.json');
    expect(script).toContain('sbom.json');
  });

  it('includes privacy documentation', () => {
    expect(script).toContain('pii-field-inventory.md');
    expect(script).toContain('sub-processors.md');
    expect(script).toContain('02-eipd.md');
  });

  it('outputs a dated ZIP file', () => {
    expect(script).toContain('energy-monitor-docs-');
    expect(script).toContain('.zip');
  });

  it('reports missing files without failing', () => {
    expect(script).toContain('Missing (skipped)');
  });
});
