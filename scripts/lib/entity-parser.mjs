import fs from 'node:fs';
import path from 'node:path';

const ENTITIES_ROOT = path.resolve(
  'monitoreo-v2/backend/src',
);

/**
 * Recursively finds TypeORM entity files under the backend src tree.
 */
export function findEntityFiles(rootDir = ENTITIES_ROOT) {
  const results = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.entity.ts')) {
        results.push(full);
      }
    }
  }

  walk(rootDir);
  return results.sort();
}

/**
 * Parses a TypeORM entity source file into structured metadata.
 */
export function parseEntityFile(content, filePath) {
  const tableMatch = content.match(/@Entity\(['"]([^'"]+)['"]\)/);
  if (!tableMatch) return null;

  const classMatch = content.match(/export class (\w+)/);
  const table = tableMatch[1];
  const className = classMatch?.[1] ?? table;

  const columns = [];
  const relations = [];

  const lines = content.split('\n');
  let pendingDecorators = [];
  let pendingComment = null;

  for (const lineRaw of lines) {
    const line = lineRaw.trim();

    if (line.startsWith('/**') || line.startsWith('*')) {
      const commentLine = line.replace(/^\/?\*+\/?\s?/, '').replace(/\*\/$/, '').trim();
      if (commentLine && !commentLine.startsWith('@')) {
        pendingComment = pendingComment ? `${pendingComment} ${commentLine}` : commentLine;
      }
      continue;
    }

    if (line.startsWith('@')) {
      pendingDecorators.push(line);
      continue;
    }

    const propMatch = line.match(/^(\w+)(!|\?)?:\s*(.+);$/);
    if (!propMatch || pendingDecorators.length === 0) {
      if (!line.startsWith('@')) pendingDecorators = [];
      continue;
    }

    const propertyName = propMatch[1];
    const tsType = propMatch[3].trim();
    const decoratorBlob = pendingDecorators.join(' ');

    if (decoratorBlob.includes('@ManyToOne') || decoratorBlob.includes('@OneToOne')) {
      const targetMatch = decoratorBlob.match(/@(?:ManyToOne|OneToOne)\(\(\)\s*=>\s*(\w+)/);
      const joinMatch = content.slice(content.indexOf(decoratorBlob)).match(
        /@JoinColumn\(\{\s*name:\s*['"]([^'"]+)['"]/,
      );
      relations.push({
        property: propertyName,
        targetClass: targetMatch?.[1] ?? 'Unknown',
        fkColumn: joinMatch?.[1] ?? `${propertyName}_id`,
        kind: decoratorBlob.includes('@OneToOne') ? 'one-to-one' : 'many-to-one',
      });
    } else if (
      decoratorBlob.includes('@Column')
      || decoratorBlob.includes('@PrimaryGeneratedColumn')
      || decoratorBlob.includes('@CreateDateColumn')
      || decoratorBlob.includes('@UpdateDateColumn')
    ) {
      const nameMatch = decoratorBlob.match(/name:\s*['"]([^'"]+)['"]/);
      const typeMatch = decoratorBlob.match(/type:\s*['"]([^'"]+)['"]/);
      const lengthMatch = decoratorBlob.match(/length:\s*(\d+)/);
      const nullable = decoratorBlob.includes('nullable: true');
      const isPk = decoratorBlob.includes('@PrimaryGeneratedColumn');
      const columnName = nameMatch?.[1] ?? camelToSnake(propertyName);

      columns.push({
        property: propertyName,
        column: columnName,
        type: typeMatch?.[1] ?? inferSqlType(tsType, decoratorBlob),
        length: lengthMatch?.[1] ?? null,
        nullable,
        primaryKey: isPk,
        comment: pendingComment,
      });
    }

    pendingDecorators = [];
    pendingComment = null;
  }

  return {
    filePath,
    table,
    className,
    columns,
    relations,
  };
}

/**
 * Loads and parses all entity files.
 */
export function loadAllEntities(rootDir = ENTITIES_ROOT) {
  return findEntityFiles(rootDir)
    .map((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      return parseEntityFile(content, filePath);
    })
    .filter(Boolean);
}

function camelToSnake(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function inferSqlType(tsType, decoratorBlob) {
  if (decoratorBlob.includes("'uuid'")) return 'uuid';
  if (tsType.includes('Date')) return 'timestamptz';
  if (tsType.includes('boolean')) return 'boolean';
  if (tsType.includes('number')) return 'numeric';
  if (tsType.includes('Record') || tsType.includes('unknown')) return 'jsonb';
  if (tsType.includes('string[]')) return 'text[]';
  return 'varchar';
}

/**
 * Maps entity class names to table names for relation resolution.
 */
export function buildClassToTableMap(entities) {
  const map = new Map();
  for (const entity of entities) {
    map.set(entity.className, entity.table);
  }
  return map;
}

/**
 * Sanitizes table name for Mermaid erDiagram identifiers.
 */
export function mermaidId(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}
