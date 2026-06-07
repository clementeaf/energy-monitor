#!/usr/bin/env node
/**
 * Import PASA CSV readings into monitoreo_v2 (tenant PASA).
 *
 * Usage:
 *   npm ci && npm run import -- --file ../../../docs/MALL_GRANDE_446_completo.csv
 *   ./import-one-month.sh   # default CSV_DIR = energy-monitor/docs
 *
 * Env:
 *   DB_HOST DB_PORT DB_NAME DB_USERNAME DB_PASSWORD  (defaults: 127.0.0.1:5434 monitoreo_v2)
 *   FROM_DATE / TO_DATE  — default January 2026 (one month)
 *   CSV_ENCODING         — latin1 (default) or utf8
 *   BATCH_SIZE           — default 2000
 *   LIMIT_ROWS           — cap rows per file (dev)
 *   SKIP_REFRESH         — set true to skip CAGG + portfolio_summary refresh
 *
 * Drive CSVs: https://drive.google.com/drive/folders/1VwbEPmoB1fXvhJTDMaP_6m3bBMYLi0-V
 */

import { createReadStream } from 'fs';
import { basename, resolve } from 'path';
import { parse } from 'csv-parse';
import {
  DEFAULT_FROM_DATE,
  DEFAULT_TO_DATE,
  PASA_TENANT_ID,
} from './lib/constants.mjs';
import { connectDb, loadBuildingMap } from './lib/db.mjs';
import {
  assertHeaders,
  inDateRange,
  normalizeRecord,
  parsePositiveInt,
} from './lib/csv-record.mjs';
import {
  insertReadingsBatch,
  loadMeterIdByCode,
  upsertMeterFromCatalog,
} from './lib/meter-catalog.mjs';
import { printSummary, refreshAggregates } from './lib/refresh-aggregates.mjs';

const FROM_DATE = process.env.FROM_DATE ?? DEFAULT_FROM_DATE;
const TO_DATE = process.env.TO_DATE ?? DEFAULT_TO_DATE;
const BATCH_SIZE = parsePositiveInt(process.env.BATCH_SIZE, 2000);
const LIMIT_ROWS = process.env.LIMIT_ROWS ? parsePositiveInt(process.env.LIMIT_ROWS, 0) : null;
const CSV_ENCODING = (process.env.CSV_ENCODING ?? 'latin1').toLowerCase();
const SKIP_REFRESH = process.env.SKIP_REFRESH === 'true';
const DRY_RUN = process.env.DRY_RUN === 'true';
const NO_REFRESH = process.argv.includes('--no-refresh');

/**
 * Parse CLI args for --file path.
 * @param {string[]} argv - process.argv slice
 * @returns {string | null}
 */
function parseFileArg(argv) {
  const idx = argv.indexOf('--file');
  if (idx >= 0 && argv[idx + 1]) {
    return resolve(argv[idx + 1]);
  }
  if (argv[0] && !argv[0].startsWith('-')) {
    return resolve(argv[0]);
  }
  return null;
}

/**
 * Build readings.source value (max 30 chars per schema).
 * @param {string} filePath - CSV file path
 * @returns {string}
 */
function buildSourceTag(filePath) {
  const base = basename(filePath, '.csv')
    .replace(/_completo$/i, '')
    .replace(/_anual$/i, '');
  return `csv:${base}`.slice(0, 30);
}

/**
 * Stream-parse one CSV file into meters + readings.
 * @param {import('pg').Client} client - DB client
 * @param {string} filePath - Absolute CSV path
 * @param {Map<string, { id: string; code: string; name: string }>} buildingMap - Buildings
 * @param {Map<string, string>} meterIdByCode - Meter UUID cache
 * @returns {Promise<{ processed: number; inserted: number; meters: number }>}
 */
async function importCsvFile(client, filePath, buildingMap, meterIdByCode) {
  const source = buildSourceTag(filePath);
  let processed = 0;
  let inserted = 0;
  let skippedRange = 0;
  const seenMeters = new Set();
  const batch = [];

  console.log(`[import] ${filePath}`);
  console.log(`[import] window ${FROM_DATE} → ${TO_DATE}, encoding=${CSV_ENCODING}`);

  const parser = createReadStream(filePath, { encoding: CSV_ENCODING }).pipe(
    parse({
      columns: true,
      delimiter: ';',
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
    }),
  );

  let rowNumber = 1;
  for await (const record of parser) {
    rowNumber += 1;
    if (rowNumber === 2) {
      assertHeaders(Object.keys(record));
    }

    if (LIMIT_ROWS != null && processed >= LIMIT_ROWS) {
      break;
    }

    let normalized;
    try {
      normalized = normalizeRecord(record, rowNumber);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[import] skip row ${rowNumber}: ${message}`);
      continue;
    }

    if (!inDateRange(normalized.reading.timestamp, FROM_DATE, TO_DATE)) {
      skippedRange += 1;
      continue;
    }

    processed += 1;
    seenMeters.add(normalized.catalog.code);

    if (DRY_RUN) {
      continue;
    }

    await upsertMeterFromCatalog(
      client,
      PASA_TENANT_ID,
      buildingMap,
      normalized.catalog,
      meterIdByCode,
    );

    batch.push({ ...normalized.reading, source });

    if (batch.length >= BATCH_SIZE) {
      inserted += await insertReadingsBatch(client, PASA_TENANT_ID, meterIdByCode, batch);
      batch.length = 0;
      if (processed % 50000 === 0) {
        console.log(`[import] ${processed} rows processed, ${inserted} inserted...`);
      }
    }
  }

  if (!DRY_RUN && batch.length > 0) {
    inserted += await insertReadingsBatch(client, PASA_TENANT_ID, meterIdByCode, batch);
  }

  console.log(
    `[import] done: processed=${processed}, inserted=${inserted}, meters=${seenMeters.size}, skippedOutOfRange=${skippedRange}`,
  );

  return { processed, inserted, meters: seenMeters.size };
}

async function main() {
  const filePath = parseFileArg(process.argv.slice(2));
  if (!filePath) {
    console.error('Usage: import-pasa-csv.mjs --file <path/to.csv>');
    process.exit(1);
  }

  const client = await connectDb();
  console.log(`[import] connected to ${process.env.DB_HOST ?? '127.0.0.1'}:${process.env.DB_PORT ?? 5434}`);

  try {
    const buildingMap = await loadBuildingMap(client, PASA_TENANT_ID);
    if (buildingMap.size === 0) {
      throw new Error('No PASA buildings found — run database init/seed first');
    }

    const meterIdByCode = await loadMeterIdByCode(client, PASA_TENANT_ID);
    const stats = await importCsvFile(client, filePath, buildingMap, meterIdByCode);

    if (!DRY_RUN && !SKIP_REFRESH && !NO_REFRESH && stats.inserted > 0) {
      await refreshAggregates(client, FROM_DATE, TO_DATE);
    }

    if (!DRY_RUN) {
      await printSummary(client, PASA_TENANT_ID);
    } else {
      console.log('[import] DRY_RUN — no writes');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
