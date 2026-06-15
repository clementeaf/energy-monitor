#!/usr/bin/env node
/**
 * DAT-18: Generate Mermaid ER diagram from TypeORM entity files.
 *
 * Usage:
 *   node scripts/generate-er-diagram.mjs [--output path]
 *
 * Reads all *.entity.ts under src/, extracts @Entity table names,
 * @Column/@CreateDateColumn/@UpdateDateColumn columns, and @ManyToOne/@JoinColumn FKs.
 * Outputs a Mermaid erDiagram block wrapped in Markdown.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '..', 'src');
const DEFAULT_OUTPUT = resolve(__dirname, '..', '..', '..', 'docs', 'context', 'er-diagram.md');

/* ── File discovery ── */

function collectEntityFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectEntityFiles(full));
      continue;
    }
    if (entry.name.endsWith('.entity.ts')) {
      results.push(full);
    }
  }
  return results.sort();
}

/* ── Parsing ── */

const ENTITY_RE = /@Entity\(\s*['"]([^'"]+)['"]\s*\)/;
const COLUMN_NAME_RE = /name:\s*['"]([^'"]+)['"]/;
const COLUMN_TYPE_RE = /type:\s*['"]([^'"]+)['"]/;
const NULLABLE_RE = /nullable:\s*true/;
const UNIQUE_RE = /unique:\s*true/;
const PRIMARY_GEN_STR_RE = /@PrimaryGeneratedColumn\(\s*['"](\w+)['"]\s*\)/;
const PRIMARY_GEN_OBJ_RE = /@PrimaryGeneratedColumn\(\s*\{[^}]*type:\s*['"](\w+)['"]/;
const PRIMARY_COL_RE = /@PrimaryColumn\(/;
const JOIN_COLUMN_RE = /@JoinColumn\(\s*\{[^}]*name:\s*['"]([^'"]+)['"]/;
const MANY_TO_ONE_RE = /@ManyToOne\(\s*\(\)\s*=>\s*(\w+)/;
const ONE_TO_ONE_RE = /@OneToOne\(\s*\(\)\s*=>\s*(\w+)/;
const ENUM_VALUES_RE = /enum:\s*\[([^\]]+)\]/;

function inferColumnType(decorator) {
  const typeMatch = decorator.match(COLUMN_TYPE_RE);
  if (typeMatch) return typeMatch[1];
  // no explicit type — infer from context
  if (decorator.includes('default: true') || decorator.includes('default: false')) return 'boolean';
  if (decorator.includes('length:')) return 'varchar';
  return 'varchar';
}

/**
 * Collapses multi-line decorators into single lines.
 * A decorator starts with @Name( and ends when parens balance.
 */
function collapseDecorators(source) {
  const lines = source.split('\n');
  const collapsed = [];
  let buffer = '';
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (depth > 0) {
      buffer += ' ' + trimmed;
      depth += countChar(trimmed, '(') - countChar(trimmed, ')');
      if (depth <= 0) {
        collapsed.push(buffer);
        buffer = '';
        depth = 0;
      }
      continue;
    }

    if (trimmed.startsWith('@') && trimmed.includes('(')) {
      depth = countChar(trimmed, '(') - countChar(trimmed, ')');
      if (depth <= 0) {
        collapsed.push(trimmed);
        continue;
      }
      buffer = trimmed;
      continue;
    }

    collapsed.push(trimmed);
  }

  return collapsed;
}

function countChar(str, ch) {
  let n = 0;
  for (const c of str) {
    if (c === ch) n++;
  }
  return n;
}

function parseEntity(source) {
  const entityMatch = source.match(ENTITY_RE);
  if (!entityMatch) return null;

  const tableName = entityMatch[1];
  const columns = [];
  const relations = [];

  const lines = collapseDecorators(source);
  let pendingDecorators = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Accumulate decorator lines
    if (trimmed.startsWith('@')) {
      pendingDecorators.push(trimmed);
      continue;
    }

    // Property declaration after decorators
    if (pendingDecorators.length > 0 && trimmed.match(/^\w+.*!?:\s/)) {
      const decoratorBlock = pendingDecorators.join(' ');
      pendingDecorators = [];

      // Primary key — @PrimaryGeneratedColumn('uuid') / ({ type: 'bigint' }) / @PrimaryColumn(...)
      const pkMatch = decoratorBlock.match(PRIMARY_GEN_STR_RE) || decoratorBlock.match(PRIMARY_GEN_OBJ_RE);
      const pkColMatch = decoratorBlock.match(PRIMARY_COL_RE);
      if (pkMatch) {
        columns.push({ name: 'id', type: pkMatch[1], pk: true, nullable: false });
        continue;
      }
      if (pkColMatch && !decoratorBlock.includes('@ManyToOne') && !decoratorBlock.includes('@OneToOne')) {
        const nameM = decoratorBlock.match(COLUMN_NAME_RE);
        const typeM = decoratorBlock.match(COLUMN_TYPE_RE);
        const propM = trimmed.match(/^(\w+)/);
        const inferredType = typeM ? typeM[1]
          : decoratorBlock.includes('length:') ? 'varchar'
          : 'uuid';
        columns.push({
          name: nameM ? nameM[1] : (propM ? propM[1] : 'id'),
          type: inferredType,
          pk: true,
          nullable: false,
        });
        continue;
      }

      // ManyToOne / OneToOne + JoinColumn → FK relation
      // Also emit a PK column when @PrimaryColumn is combined with a relation (composite PK)
      const mtoMatch = decoratorBlock.match(MANY_TO_ONE_RE) || decoratorBlock.match(ONE_TO_ONE_RE);
      const jcMatch = decoratorBlock.match(JOIN_COLUMN_RE);
      if (mtoMatch && jcMatch) {
        relations.push({ fkColumn: jcMatch[1], targetEntity: mtoMatch[1] });
        if (PRIMARY_COL_RE.test(decoratorBlock)) {
          columns.push({ name: jcMatch[1], type: 'uuid', pk: true, nullable: false });
        }
        continue;
      }

      // Regular column / CreateDateColumn / UpdateDateColumn
      const isColumn = decoratorBlock.includes('@Column(')
        || decoratorBlock.includes('@CreateDateColumn(')
        || decoratorBlock.includes('@UpdateDateColumn(');
      if (!isColumn) continue;

      const nameMatch = decoratorBlock.match(COLUMN_NAME_RE);
      const propMatch = trimmed.match(/^(\w+)/);
      const colName = nameMatch ? nameMatch[1] : (propMatch ? propMatch[1] : 'unknown');
      const colType = inferColumnType(decoratorBlock);
      const nullable = NULLABLE_RE.test(decoratorBlock);
      const unique = UNIQUE_RE.test(decoratorBlock);
      const enumMatch = decoratorBlock.match(ENUM_VALUES_RE);
      const enumValues = enumMatch
        ? enumMatch[1].replace(/['"]/g, '').split(',').map(v => v.trim()).filter(Boolean)
        : null;

      columns.push({
        name: colName,
        type: enumValues ? `enum(${enumValues.join(',')})` : colType,
        pk: false,
        nullable,
        unique,
      });
      continue;
    }

    // Non-decorator, non-property — reset
    if (!trimmed.startsWith('@')) {
      pendingDecorators = [];
    }
  }

  return { tableName, columns, relations };
}

/* ── Entity name → table name resolution ── */

function buildEntityTableMap(entities) {
  const map = new Map();
  for (const e of entities) {
    // Derive entity class name from table: "users" → "User", "alert_rules" → "AlertRule"
    // But we need the actual class name from the source. Re-parse it.
    map.set(e._className, e.tableName);
  }
  return map;
}

function extractClassName(source) {
  const match = source.match(/export\s+class\s+(\w+)/);
  return match ? match[1] : null;
}

/* ── Mermaid generation ── */

function mermaidType(col) {
  const t = col.type;
  if (col.pk) return col.type === 'uuid' ? 'uuid' : 'serial';
  const MAP = {
    uuid: 'uuid',
    varchar: 'varchar',
    text: 'text',
    integer: 'int',
    smallint: 'smallint',
    boolean: 'bool',
    timestamptz: 'timestamptz',
    decimal: 'decimal',
    jsonb: 'jsonb',
    inet: 'inet',
    char: 'char',
  };
  // enum types
  if (t.startsWith('enum(')) return t;
  return MAP[t] ?? t;
}

function generateMermaid(entities, entityTableMap) {
  const lines = ['erDiagram'];

  // Relations first
  for (const entity of entities) {
    for (const rel of entity.relations) {
      const targetTable = entityTableMap.get(rel.targetEntity);
      if (!targetTable) continue;
      // ManyToOne: this table }o--|| target table
      lines.push(`    ${entity.tableName} }o--|| ${targetTable} : "${rel.fkColumn}"`);
    }
  }

  lines.push('');

  // Table definitions
  for (const entity of entities) {
    lines.push(`    ${entity.tableName} {`);
    for (const col of entity.columns) {
      const constraint = col.pk ? 'PK' : (col.unique ? 'UK' : '');
      const suffix = [constraint, col.nullable ? '"nullable"' : ''].filter(Boolean).join(' ');
      lines.push(`        ${mermaidType(col)} ${col.name}${suffix ? ' ' + suffix : ''}`);
    }
    lines.push('    }');
  }

  return lines.join('\n');
}

/* ── Markdown output ── */

function generateMarkdown(mermaid, entityCount, relationCount) {
  return `# ER Diagram — monitoreo-v2

> Auto-generated by \`scripts/generate-er-diagram.mjs\` from ${entityCount} TypeORM entities.
> ${relationCount} foreign key relations detected.
>
> Re-generate: \`npm run db:er-diagram\`

\`\`\`mermaid
${mermaid}
\`\`\`
`;
}

/* ── Main ── */

export function generate(srcDir = SRC_DIR) {
  const files = collectEntityFiles(srcDir);
  const entities = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf-8');
    const parsed = parseEntity(source);
    if (!parsed) continue;
    const className = extractClassName(source);
    parsed._className = className;
    entities.push(parsed);
  }

  const entityTableMap = buildEntityTableMap(entities);
  const mermaid = generateMermaid(entities, entityTableMap);
  const totalRelations = entities.reduce((acc, e) => acc + e.relations.length, 0);

  return {
    mermaid,
    markdown: generateMarkdown(mermaid, entities.length, totalRelations),
    entityCount: entities.length,
    relationCount: totalRelations,
    tableNames: entities.map(e => e.tableName),
  };
}

// CLI entry point
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const outputIdx = process.argv.indexOf('--output');
  const outputPath = outputIdx >= 0 ? resolve(process.argv[outputIdx + 1]) : DEFAULT_OUTPUT;

  const result = generate();
  writeFileSync(outputPath, result.markdown, 'utf-8');
  console.log(`ER diagram: ${result.entityCount} tables, ${result.relationCount} relations → ${outputPath}`);
}
