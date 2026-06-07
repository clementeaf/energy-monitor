#!/usr/bin/env node
/**
 * GAP-200: Generate Mermaid ER diagram from TypeORM entities.
 * Usage: node scripts/generate-der.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  loadAllEntities,
  buildClassToTableMap,
  mermaidId,
} from './lib/entity-parser.mjs';

const OUT_MD = path.resolve('docs/PASA/DER.md');
const entities = loadAllEntities();
const classToTable = buildClassToTableMap(entities);

const lines = [
  '# DER — Monitoreo v2 (auto-generado)',
  '',
  `Generado: ${new Date().toISOString().slice(0, 10)} · ${entities.length} entidades`,
  '',
  '> Regenerar: `node scripts/generate-der.mjs`',
  '',
  '```mermaid',
  'erDiagram',
];

const relationKeys = new Set();

for (const entity of entities) {
  for (const rel of entity.relations) {
    const parentTable = classToTable.get(rel.targetClass);
    if (!parentTable) continue;
    const childTable = entity.table;
    const key = `${parentTable}->${childTable}:${rel.fkColumn}`;
    if (relationKeys.has(key)) continue;
    relationKeys.add(key);
    lines.push(`  ${mermaidId(parentTable)} ||--o{ ${mermaidId(childTable)} : "${rel.fkColumn}"`);
  }
}

lines.push('');

for (const entity of entities) {
  lines.push(`  ${mermaidId(entity.table)} {`);
  for (const col of entity.columns.slice(0, 24)) {
    const pk = col.primaryKey ? ' PK' : '';
    const nn = col.nullable ? '' : ' "NOT NULL"';
    lines.push(`    ${col.type} ${col.column}${pk}${nn}`);
  }
  if (entity.columns.length > 24) {
    lines.push(`    varchar _truncated "${entity.columns.length - 24} cols omitted"`);
  }
  lines.push('  }');
}

lines.push('```', '');

fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${OUT_MD} (${entities.length} entities, ${relationKeys.size} relations)`);
