#!/usr/bin/env node

/**
 * ARQ-15 — Package all platform documentation into a ZIP deliverable.
 * Output: docs/deliverable/energy-monitor-docs-YYYY-MM-DD.zip
 *
 * Usage: node scripts/package-docs.mjs
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { resolve, relative, basename } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const DOCS_DIR = resolve(ROOT, 'docs');
const OUTPUT_DIR = resolve(DOCS_DIR, 'deliverable');
const TODAY = new Date().toISOString().slice(0, 10);
const ZIP_NAME = `energy-monitor-docs-${TODAY}.zip`;

const DOC_SOURCES = [
  'docs/context/er-diagram.md',
  'docs/context/api-error-catalog.md',
  'docs/context/data-catalog.md',
  'docs/context/api-operations.md',
  'docs/context/kpi-business-rules.md',
  'docs/context/network-requirements.md',
  'docs/context/protocol-mapping.md',
  'docs/context/api-endpoints.md',
  'docs/context/db-schema.md',
  'docs/context/frontend-views.md',
  'docs/context/auth-rbac.md',
  'docs/context/ingest-pipeline.md',
  'docs/context/functional-spec.md',
  'docs/ops/bcp-drp.md',
  'docs/ops/change-management.md',
  'docs/ops/security-processes.md',
  'docs/ops/rds-migrations-via-ecs-exec.md',
  'docs/privacy/README.md',
  'docs/privacy/01-dpa-aws.md',
  'docs/privacy/02-eipd.md',
  'docs/privacy/03-transferencia-internacional.md',
  'docs/privacy/04-dpo-designacion.md',
  'docs/privacy/pii-field-inventory.md',
  'docs/privacy/sub-processors.md',
  'docs/postman-collection.json',
  'docs/sbom.json',
  'docs/sbom-summary.md',
];

const existing = DOC_SOURCES
  .map((rel) => resolve(ROOT, rel))
  .filter((abs) => existsSync(abs));

const missing = DOC_SOURCES.filter((rel) => !existsSync(resolve(ROOT, rel)));

console.log(`[package-docs] Found ${existing.length}/${DOC_SOURCES.length} docs`);
if (missing.length > 0) {
  console.log(`[package-docs] Missing (skipped): ${missing.join(', ')}`);
}

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

const zipPath = resolve(OUTPUT_DIR, ZIP_NAME);
const relPaths = existing.map((abs) => relative(ROOT, abs));

execSync(
  `cd "${ROOT}" && zip -j "${zipPath}" ${relPaths.map((p) => `"${p}"`).join(' ')}`,
  { stdio: 'pipe' },
);

const sizeKb = Math.round(statSync(zipPath).size / 1024);
console.log(`[package-docs] Created: ${relative(ROOT, zipPath)} (${sizeKb} KB, ${existing.length} files)`);
