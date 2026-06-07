#!/usr/bin/env node
/**
 * GAP-201: Generate data dictionary CSV from TypeORM entities.
 * Usage: node scripts/generate-data-dictionary.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAllEntities } from './lib/entity-parser.mjs';

const OUT_CSV = path.resolve('docs/PASA/data-dictionary.csv');

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const entities = loadAllEntities();
const rows = [
  ['table', 'column', 'property', 'type', 'nullable', 'primary_key', 'comment', 'source_file'],
];

for (const entity of entities) {
  for (const col of entity.columns) {
    rows.push([
      entity.table,
      col.column,
      col.property,
      col.length ? `${col.type}(${col.length})` : col.type,
      col.nullable ? 'yes' : 'no',
      col.primaryKey ? 'yes' : 'no',
      col.comment ?? '',
      path.relative(process.cwd(), entity.filePath),
    ]);
  }
}

const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
fs.writeFileSync(OUT_CSV, `${csv}\n`, 'utf8');

const colCount = rows.length - 1;
console.log(`Wrote ${OUT_CSV} (${entities.length} tables, ${colCount} columns)`);
