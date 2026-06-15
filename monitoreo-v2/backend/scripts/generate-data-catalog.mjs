#!/usr/bin/env node
/**
 * DAT-05: Generate formal data catalog with field descriptions and units.
 *
 * Usage:
 *   node scripts/generate-data-catalog.mjs [--output path]
 *
 * Scans entity files, enriches columns with known units/descriptions,
 * outputs a structured data catalog for PASA Data Lake integration.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '..', 'src');
const DEFAULT_OUTPUT = resolve(__dirname, '..', '..', '..', 'docs', 'context', 'data-catalog.md');

/* ── Known units and descriptions for energy domain columns ── */

const FIELD_META = {
  // Electrical measurements
  voltage_l1: { unit: 'V', desc: 'Phase L1 RMS voltage' },
  voltage_l2: { unit: 'V', desc: 'Phase L2 RMS voltage' },
  voltage_l3: { unit: 'V', desc: 'Phase L3 RMS voltage' },
  current_l1: { unit: 'A', desc: 'Phase L1 RMS current' },
  current_l2: { unit: 'A', desc: 'Phase L2 RMS current' },
  current_l3: { unit: 'A', desc: 'Phase L3 RMS current' },
  power_kw: { unit: 'kW', desc: 'Active power (3-phase total)' },
  reactive_power_kvar: { unit: 'kVAR', desc: 'Reactive power' },
  power_factor: { unit: '—', desc: 'Power factor (0.0–1.0)' },
  frequency_hz: { unit: 'Hz', desc: 'Grid frequency' },
  energy_kwh_total: { unit: 'kWh', desc: 'Cumulative energy import (monotonic counter)' },
  thd_voltage_pct: { unit: '%', desc: 'Total harmonic distortion — voltage' },
  thd_current_pct: { unit: '%', desc: 'Total harmonic distortion — current' },
  phase_imbalance_pct: { unit: '%', desc: 'Phase voltage imbalance' },
  peak_demand_kw: { unit: 'kW', desc: 'Peak demand in period' },
  contracted_demand_kw: { unit: 'kW', desc: 'Contracted demand limit' },
  nominal_voltage: { unit: 'V', desc: 'Meter nominal voltage rating' },
  nominal_current: { unit: 'A', desc: 'Meter nominal current rating' },
  area_sqm: { unit: 'm²', desc: 'Building floor area' },
  // Tariff / billing
  energy_rate: { unit: 'CLP/kWh', desc: 'Energy charge rate per block' },
  demand_rate: { unit: 'CLP/kW', desc: 'Demand charge rate (monthly peak)' },
  reactive_rate: { unit: 'CLP/kVAh', desc: 'Reactive energy charge rate' },
  fixed_charge: { unit: 'CLP', desc: 'Fixed monthly charge per block' },
  tax_rate: { unit: '—', desc: 'Tax rate (0.19 = 19% IVA Chile)' },
  // Temporal
  timestamp: { unit: 'UTC', desc: 'Event timestamp (ISO 8601, stored as timestamptz)' },
  created_at: { unit: 'UTC', desc: 'Record creation timestamp' },
  updated_at: { unit: 'UTC', desc: 'Last modification timestamp' },
  expires_at: { unit: 'UTC', desc: 'Expiration timestamp' },
  last_login_at: { unit: 'UTC', desc: 'Last successful login timestamp' },
  last_activity_at: { unit: 'UTC', desc: 'Last API activity for idle timeout' },
  ingested_at: { unit: 'UTC', desc: 'Reading ingest timestamp (server-side)' },
  // Quality / source
  quality: { unit: 'enum', desc: 'Data quality flag: measured, estimated, invalid, unknown' },
  source: { unit: 'enum', desc: 'Ingest origin: modbus, mqtt, api_ingress, backfill, synthetic, drive_pipeline, manual_cnr' },
  // Identifiers
  tenant_id: { unit: 'UUID', desc: 'Tenant (company/organization) identifier' },
  building_id: { unit: 'UUID', desc: 'Building/site identifier' },
  meter_id: { unit: 'UUID', desc: 'Meter device identifier' },
  user_id: { unit: 'UUID', desc: 'User account identifier' },
  role_id: { unit: 'UUID', desc: 'Role assignment identifier' },
  // Status
  is_active: { unit: 'boolean', desc: 'Soft-delete flag (true = active)' },
  // Network
  ip_address: { unit: 'inet', desc: 'IPv4/IPv6 address' },
};

/* ── File discovery + parsing (reuse ER diagram pattern) ── */

function collectEntityFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectEntityFiles(full));
      continue;
    }
    if (entry.name.endsWith('.entity.ts') && !entry.name.endsWith('.spec.ts')) {
      results.push(full);
    }
  }
  return results.sort();
}

const ENTITY_RE = /@Entity\(\s*['"]([^'"]+)['"]\s*\)/;
const COL_NAME_RE = /name:\s*['"]([^'"]+)['"]/;
const COL_TYPE_RE = /type:\s*['"]([^'"]+)['"]/;
const NULLABLE_RE = /nullable:\s*true/;

function parseEntityForCatalog(filePath) {
  const source = readFileSync(filePath, 'utf-8');
  const entityMatch = source.match(ENTITY_RE);
  if (!entityMatch) return null;

  const tableName = entityMatch[1];
  const columns = [];

  // Collapse multi-line decorators
  const lines = collapseDecorators(source);
  let pendingDecorators = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('@')) {
      pendingDecorators.push(trimmed);
      continue;
    }

    if (pendingDecorators.length > 0 && trimmed.match(/^\w+.*!?:\s/)) {
      const block = pendingDecorators.join(' ');
      pendingDecorators = [];

      const isCol = block.includes('@Column(') || block.includes('@CreateDateColumn(')
        || block.includes('@UpdateDateColumn(') || block.includes('@PrimaryGeneratedColumn(')
        || block.includes('@PrimaryColumn(');
      if (!isCol) continue;

      const nameMatch = block.match(COL_NAME_RE);
      const propMatch = trimmed.match(/^(\w+)/);
      const colName = nameMatch ? nameMatch[1] : (propMatch ? propMatch[1].replace(/[A-Z]/g, m => '_' + m.toLowerCase()) : 'unknown');
      const typeMatch = block.match(COL_TYPE_RE);
      const colType = typeMatch ? typeMatch[1] : (block.includes('PrimaryGeneratedColumn') ? 'uuid' : 'varchar');
      const nullable = NULLABLE_RE.test(block);

      columns.push({ name: colName, type: colType, nullable });
      continue;
    }

    if (!trimmed.startsWith('@')) {
      pendingDecorators = [];
    }
  }

  return { tableName, columns, file: relative(SRC_DIR, filePath) };
}

function collapseDecorators(source) {
  const lines = source.split('\n');
  const collapsed = [];
  let buffer = '';
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (depth > 0) {
      buffer += ' ' + trimmed;
      depth += count(trimmed, '(') - count(trimmed, ')');
      if (depth <= 0) { collapsed.push(buffer); buffer = ''; depth = 0; }
      continue;
    }
    if (trimmed.startsWith('@') && trimmed.includes('(')) {
      depth = count(trimmed, '(') - count(trimmed, ')');
      if (depth <= 0) { collapsed.push(trimmed); continue; }
      buffer = trimmed;
      continue;
    }
    collapsed.push(trimmed);
  }
  return collapsed;
}

function count(str, ch) {
  let n = 0;
  for (const c of str) { if (c === ch) n++; }
  return n;
}

/* ── Markdown generation ── */

function generateMarkdown(entities) {
  const totalColumns = entities.reduce((acc, e) => acc + e.columns.length, 0);
  const enrichedCount = entities.reduce((acc, e) =>
    acc + e.columns.filter(c => FIELD_META[c.name]).length, 0);

  const lines = [
    '# Data Catalog — monitoreo-v2',
    '',
    `> Auto-generated by \`scripts/generate-data-catalog.mjs\`.`,
    `> ${entities.length} tables, ${totalColumns} columns, ${enrichedCount} with unit/description metadata.`,
    '> Re-generate: `npm run docs:data-catalog`',
    '',
    '> DAT-05 (Anexo 07): Field catalog with lineage, units, and data types.',
    '',
    '---',
    '',
  ];

  for (const entity of entities) {
    lines.push(`## ${entity.tableName}`);
    lines.push('');
    lines.push('| Column | Type | Nullable | Unit | Description |');
    lines.push('|--------|------|:--------:|------|-------------|');

    for (const col of entity.columns) {
      const meta = FIELD_META[col.name];
      const unit = meta?.unit ?? '—';
      const desc = meta?.desc ?? '';
      const nullable = col.nullable ? 'Yes' : 'No';
      lines.push(`| \`${col.name}\` | ${col.type} | ${nullable} | ${unit} | ${desc} |`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/* ── Main ── */

export function generate(srcDir = SRC_DIR) {
  const files = collectEntityFiles(srcDir);
  const entities = [];
  for (const file of files) {
    const parsed = parseEntityForCatalog(file);
    if (parsed) entities.push(parsed);
  }

  entities.sort((a, b) => a.tableName.localeCompare(b.tableName));
  const markdown = generateMarkdown(entities);
  const totalColumns = entities.reduce((acc, e) => acc + e.columns.length, 0);

  return {
    markdown,
    tableCount: entities.length,
    columnCount: totalColumns,
    tables: entities.map(e => e.tableName),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const outputIdx = process.argv.indexOf('--output');
  const outputPath = outputIdx >= 0 ? resolve(process.argv[outputIdx + 1]) : DEFAULT_OUTPUT;

  const result = generate();
  writeFileSync(outputPath, result.markdown, 'utf-8');
  console.log(`Data catalog: ${result.tableCount} tables, ${result.columnCount} columns → ${outputPath}`);
}
