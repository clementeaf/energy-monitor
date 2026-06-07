#!/usr/bin/env node
/**
 * GAP-202: Generate API error catalog markdown from api-error-codes.ts.
 * Usage: node scripts/generate-error-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('monitoreo-v2/backend/src/common/errors/api-error-codes.ts');
const OUT = path.resolve('docs/api-error-catalog.md');

const content = fs.readFileSync(SRC, 'utf8');
const entries = [];

const blockRegex = /\{\s*code:\s*ApiErrorCode\.(\w+),\s*httpStatus:\s*(\d+),\s*message:\s*'([^']*)',\s*module:\s*'([^']*)',?\s*\}/g;

let match = blockRegex.exec(content);
while (match) {
  entries.push({
    code: match[1],
    httpStatus: Number(match[2]),
    message: match[3],
    module: match[4],
  });
  match = blockRegex.exec(content);
}

const lines = [
  '# Catálogo de errores API (auto-generado)',
  '',
  `Generado: ${new Date().toISOString().slice(0, 10)} · ${entries.length} códigos`,
  '',
  '> Fuente: `monitoreo-v2/backend/src/common/errors/api-error-codes.ts`',
  '',
  '> Regenerar: `node scripts/generate-error-catalog.mjs`',
  '',
  '| Código | HTTP | Módulo | Mensaje |',
  '|--------|------|--------|---------|',
];

for (const entry of entries) {
  lines.push(`| \`${entry.code}\` | ${entry.httpStatus} | ${entry.module} | ${entry.message} |`);
}

lines.push('');
fs.writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${OUT} (${entries.length} entries)`);
