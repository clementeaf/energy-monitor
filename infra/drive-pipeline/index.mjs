/**
 * drive-pipeline/index.mjs
 *
 * Orquestador unificado: Google Drive → S3 (con detección de cambios) → RDS staging.
 *
 * Variables de entorno:
 *   AWS_REGION              (default: us-east-1)
 *   DB_SECRET_NAME          (default: energy-monitor/drive-ingest/db)
 *   GOOGLE_SECRET_NAME      (default: energy-monitor/drive-ingest/google-service-account)
 *   GOOGLE_DRIVE_FOLDER_ID  (default: 1VwbEPmoB1fXvhJTDMaP_6m3bBMYLi0-V)
 *   S3_BUCKET               (default: energy-monitor-ingest-058310292956)
 *   S3_RAW_PREFIX           (default: raw)
 *   S3_MANIFEST_PREFIX      (default: manifests)
 *   SOURCE_FILES            (opcional, CSV separado por comas para filtrar archivos)
 *   FORCE_DOWNLOAD          (default: false — si true, descarga todos sin chequear cambios)
 *   BATCH_SIZE              (default: 2500 — filas por INSERT a staging)
 *   LIMIT_ROWS              (opcional — limita filas para tests)
 */

import { createHash } from 'crypto';
import { PassThrough, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Upload } from '@aws-sdk/lib-storage';
import { google } from 'googleapis';
import { parse } from 'csv-parse';
import pg from 'pg';

const { Client } = pg;

// ─── Config ─────────────────────────────────────────────────────────────────

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const GOOGLE_SECRET_NAME = process.env.GOOGLE_SECRET_NAME || 'energy-monitor/drive-ingest/google-service-account';
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1VwbEPmoB1fXvhJTDMaP_6m3bBMYLi0-V';
const S3_BUCKET = process.env.S3_BUCKET || 'energy-monitor-ingest-058310292956';
const RAW_PREFIX = process.env.S3_RAW_PREFIX || 'raw';
const MANIFEST_PREFIX = process.env.S3_MANIFEST_PREFIX || 'manifests';
const SOURCE_FILES = (process.env.SOURCE_FILES || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const FORCE_DOWNLOAD = process.env.FORCE_DOWNLOAD === 'true';
const BATCH_SIZE = parsePositiveInt(process.env.BATCH_SIZE, 2500);
const LIMIT_ROWS = parseLimit(process.env.LIMIT_ROWS);

// ─── AWS clients ─────────────────────────────────────────────────────────────

const secretsClient = new SecretsManagerClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLimit(value) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getSecretJson(secretId) {
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) throw new Error(`Secret ${secretId} has no SecretString`);
  return JSON.parse(response.SecretString);
}

function buildDbConfig(secret) {
  return {
    host: process.env.DB_HOST || secret.host || secret.DB_HOST,
    port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
    database: secret.dbname || secret.database || secret.DB_NAME,
    user: secret.username || secret.user || secret.DB_USERNAME,
    password: secret.password || secret.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  };
}

// ─── Fase 1: detección de cambios (Drive → S3) ───────────────────────────────

async function getLastManifestModifiedTime(fileName) {
  const prefix = `${MANIFEST_PREFIX}/`;
  let continuationToken;
  let latestKey = null;
  let latestModified = null;

  do {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    for (const obj of (response.Contents || [])) {
      if (!obj.Key.endsWith(`-${fileName}.json`)) continue;
      if (!latestModified || obj.LastModified > latestModified) {
        latestKey = obj.Key;
        latestModified = obj.LastModified;
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  if (!latestKey) return null;

  const res = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: latestKey }));
  const body = await res.Body.transformToString();
  return JSON.parse(body).driveModifiedTime || null;
}

async function buildDriveClient() {
  const credentials = await getSecretJson(GOOGLE_SECRET_NAME);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

async function listFolderCsvFiles(drive) {
  const files = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'nextPageToken, files(id, name, size, modifiedTime, mimeType)',
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const pageFiles = (response.data.files || []).filter((f) =>
      f.name?.toLowerCase().endsWith('.csv'),
    );
    files.push(...pageFiles);
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  if (SOURCE_FILES.length === 0) return files;
  const selectedNames = new Set(SOURCE_FILES);
  return files.filter((f) => selectedNames.has(f.name));
}

async function uploadDriveFileToS3(drive, file) {
  const startedAt = new Date().toISOString();
  const rawKey = `${RAW_PREFIX}/${file.name}`;
  const safeTs = startedAt.replace(/[:.]/g, '-');
  const manifestKey = `${MANIFEST_PREFIX}/${safeTs}-${file.name}.json`;

  const hash = createHash('sha256');
  const hashingStream = new Transform({
    transform(chunk, _enc, cb) { hash.update(chunk); cb(null, chunk); },
  });
  const uploadBody = new PassThrough();

  const driveStream = await drive.files.get(
    { fileId: file.id, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' },
  );

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: S3_BUCKET,
      Key: rawKey,
      Body: uploadBody,
      ContentType: 'text/csv',
      Metadata: { driveFileId: file.id, driveModifiedTime: file.modifiedTime || '' },
    },
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  });

  await Promise.all([upload.done(), pipeline(driveStream.data, hashingStream, uploadBody)]);

  const completedAt = new Date().toISOString();
  const manifest = {
    fileName: file.name,
    driveFileId: file.id,
    driveFolderId: DRIVE_FOLDER_ID,
    driveModifiedTime: file.modifiedTime,
    sizeBytes: file.size ? Number(file.size) : null,
    s3Bucket: S3_BUCKET,
    s3Key: rawKey,
    status: 'uploaded',
    startedAt,
    completedAt,
    sha256: hash.digest('hex'),
  };

  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: manifestKey,
    Body: JSON.stringify(manifest, null, 2),
    ContentType: 'application/json',
  }));

  return manifest;
}

// ─── Fase 2: importación a staging (S3 → RDS) ───────────────────────────────

const REQUIRED_HEADERS = [
  'timestamp', 'meter_id', 'center_name', 'center_type', 'store_type', 'store_name',
  'model', 'phase_type', 'uplink_route', 'modbus_address',
  'voltage_L1', 'voltage_L2', 'voltage_L3',
  'current_L1', 'current_L2', 'current_L3',
  'power_kW', 'reactive_power_kvar', 'power_factor', 'frequency_Hz', 'energy_kWh_total',
];

const INSERT_COLUMNS = [
  'source_file', 'source_bucket', 'source_key', 'source_row_number',
  'timestamp', 'meter_id', 'center_name', 'center_type', 'store_type', 'store_name',
  'model', 'phase_type', 'uplink_route', 'modbus_address',
  'voltage_l1', 'voltage_l2', 'voltage_l3',
  'current_l1', 'current_l2', 'current_l3',
  'power_kw', 'reactive_power_kvar', 'power_factor', 'frequency_hz', 'energy_kwh_total',
];

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const EXPECTED_PHASE_BY_MODEL = { PAC1670: '3P', PAC1651: '1P' };

function parseOptionalText(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function parseRequiredText(v, field, row) {
  const p = parseOptionalText(v);
  if (p == null) throw new Error(`Row ${row}: ${field} is required`);
  return p;
}

function parseDecimal(v, field, row, { required = false, integer = false } = {}) {
  const p = parseOptionalText(v);
  if (p == null) {
    if (required) throw new TypeError(`Row ${row}: ${field} is required`);
    return null;
  }
  const n = integer ? Number.parseInt(p.replace(',', '.'), 10) : Number(p.replace(',', '.'));
  if (Number.isNaN(n)) throw new TypeError(`Row ${row}: ${field} is not numeric`);
  return n;
}

function parseTimestamp(v, row) {
  const p = parseRequiredText(v, 'timestamp', row);
  const d = new Date(p);
  if (Number.isNaN(d.getTime())) throw new TypeError(`Row ${row}: timestamp is invalid`);
  return d.toISOString();
}

function normalizeRecord(record, sourceFile, s3Key, rowNumber) {
  return {
    source_file: sourceFile,
    source_bucket: S3_BUCKET,
    source_key: s3Key,
    source_row_number: rowNumber,
    timestamp: parseTimestamp(record.timestamp, rowNumber),
    meter_id: parseRequiredText(record.meter_id, 'meter_id', rowNumber),
    center_name: parseRequiredText(record.center_name, 'center_name', rowNumber),
    center_type: parseRequiredText(record.center_type, 'center_type', rowNumber),
    store_type: parseRequiredText(record.store_type, 'store_type', rowNumber),
    store_name: parseRequiredText(record.store_name, 'store_name', rowNumber),
    model: parseRequiredText(record.model, 'model', rowNumber),
    phase_type: parseRequiredText(record.phase_type, 'phase_type', rowNumber),
    uplink_route: parseRequiredText(record.uplink_route, 'uplink_route', rowNumber),
    modbus_address: parseDecimal(record.modbus_address, 'modbus_address', rowNumber, { required: true, integer: true }),
    voltage_l1: parseDecimal(record.voltage_L1, 'voltage_L1', rowNumber),
    voltage_l2: parseDecimal(record.voltage_L2, 'voltage_L2', rowNumber),
    voltage_l3: parseDecimal(record.voltage_L3, 'voltage_L3', rowNumber),
    current_l1: parseDecimal(record.current_L1, 'current_L1', rowNumber),
    current_l2: parseDecimal(record.current_L2, 'current_L2', rowNumber),
    current_l3: parseDecimal(record.current_L3, 'current_L3', rowNumber),
    power_kw: parseDecimal(record.power_kW, 'power_kW', rowNumber, { required: true }),
    reactive_power_kvar: parseDecimal(record.reactive_power_kvar, 'reactive_power_kvar', rowNumber),
    power_factor: parseDecimal(record.power_factor, 'power_factor', rowNumber),
    frequency_hz: parseDecimal(record.frequency_Hz, 'frequency_Hz', rowNumber),
    energy_kwh_total: parseDecimal(record.energy_kWh_total, 'energy_kWh_total', rowNumber, { required: true }),
  };
}

function validateRecord(record, state) {
  if (record.power_kw < 0) {
    console.warn(`Row ${record.source_row_number}: power_kW negative (skipping)`);
    return false;
  }

  const expectedPhase = EXPECTED_PHASE_BY_MODEL[record.model];
  if (expectedPhase && record.phase_type !== expectedPhase) {
    console.warn(`Row ${record.source_row_number}: model/phase mismatch (skipping)`);
    return false;
  }

  const previous = state.byMeter.get(record.meter_id);
  if (previous) {
    const deltaMs = Date.parse(record.timestamp) - Date.parse(previous.timestamp);
    if (deltaMs <= 0) {
      console.warn(`Row ${record.source_row_number}: timestamp not ascending for meter ${record.meter_id} (skipping)`);
      return false;
    }
    if (deltaMs !== FIFTEEN_MINUTES_MS) state.timestampStepMismatches += 1;
    if (record.energy_kwh_total < previous.energyKwhTotal) {
      console.warn(`Row ${record.source_row_number}: energy_kWh_total decreased for meter ${record.meter_id} (skipping)`);
      return false;
    }
  }

  state.byMeter.set(record.meter_id, {
    timestamp: record.timestamp,
    energyKwhTotal: record.energy_kwh_total,
  });
  state.uniqueMeters.add(record.meter_id);
  return true;
}

function buildInsertStatement(rowCount) {
  const placeholders = [];
  let idx = 1;
  for (let r = 0; r < rowCount; r++) {
    const cols = INSERT_COLUMNS.map(() => `$${idx++}`);
    placeholders.push(`(${cols.join(', ')})`);
  }
  return `INSERT INTO readings_import_staging (${INSERT_COLUMNS.join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (meter_id, timestamp, source_file) DO NOTHING`;
}

async function flushBatch(client, batch) {
  if (batch.length === 0) return 0;
  const params = [];
  for (const row of batch) {
    for (const col of INSERT_COLUMNS) params.push(row[col]);
  }
  const result = await client.query(buildInsertStatement(batch.length), params);
  console.log(`  Flushed batch of ${batch.length} row(s) → ${result.rowCount} inserted`);
  batch.length = 0;
  return result.rowCount || 0;
}

async function importFileToStaging(dbClient, s3Key) {
  const s3Object = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }));
  if (!s3Object.Body) throw new Error(`S3 object ${s3Key} has no body`);

  const sourceFile = s3Key.split('/').pop() || s3Key;
  const parser = parse({
    bom: true,
    columns: (header) => {
      const normalized = new Set(header.map((h) => h.trim().replace(/^\uFEFF/, '')));
      const missing = REQUIRED_HEADERS.filter((h) => !normalized.has(h));
      if (missing.length > 0) throw new Error(`CSV missing columns: ${missing.join(', ')}`);
      return header.map((h) => h.trim().replace(/^\uFEFF/, ''));
    },
    delimiter: ';',
    skip_empty_lines: true,
    trim: true,
  });

  const batch = [];
  let rowNumber = 0;
  let insertedRows = 0;
  const state = { byMeter: new Map(), timestampStepMismatches: 0, uniqueMeters: new Set() };

  s3Object.Body.pipe(parser);

  try {
    for await (const record of parser) {
      rowNumber += 1;
      const normalized = normalizeRecord(record, sourceFile, s3Key, rowNumber);
      if (validateRecord(normalized, state)) batch.push(normalized);

      if (LIMIT_ROWS && rowNumber >= LIMIT_ROWS) { parser.destroy(); break; }
      if (batch.length >= BATCH_SIZE) insertedRows += await flushBatch(dbClient, batch);
    }
  } catch (err) {
    if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw err;
  }

  if (batch.length > 0) insertedRows += await flushBatch(dbClient, batch);

  return {
    s3Key,
    processedRows: rowNumber,
    insertedRows,
    uniqueMeters: state.uniqueMeters.size,
    timestampStepMismatches: state.timestampStepMismatches,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[pipeline] Starting drive-pipeline...');

  // 1. Cargar secretos y conectar a Drive/DB
  const [dbSecret] = await Promise.all([getSecretJson(DB_SECRET_NAME)]);
  const drive = await buildDriveClient();
  const files = await listFolderCsvFiles(drive);

  if (files.length === 0) throw new Error('No CSV files found in Drive folder');
  console.log(`[pipeline] Found ${files.length} CSV file(s) in folder ${DRIVE_FOLDER_ID}`);

  if (FORCE_DOWNLOAD) {
    console.log('[pipeline] FORCE_DOWNLOAD=true — skipping change detection');
  }

  // 2. Para cada archivo: detectar cambios → descargar si aplica → importar a staging
  const dbClient = new Client(buildDbConfig(dbSecret));
  await dbClient.connect();
  console.log('[pipeline] Connected to staging database');

  const results = { uploaded: [], skipped: [], imported: [] };

  try {
    for (const file of files) {
      console.log(`\n[pipeline] Processing: ${file.name}`);

      // Detección de cambios
      if (!FORCE_DOWNLOAD) {
        const lastModifiedTime = await getLastManifestModifiedTime(file.name);
        if (lastModifiedTime && lastModifiedTime === file.modifiedTime) {
          console.log(`  [skip] No changes since last ingest (driveModifiedTime: ${file.modifiedTime})`);
          results.skipped.push(file.name);
          continue;
        }
        if (lastModifiedTime) {
          console.log(`  [changed] previous: ${lastModifiedTime} → current: ${file.modifiedTime}`);
        } else {
          console.log(`  [new] No previous manifest found`);
        }
      }

      // Descarga Drive → S3
      console.log(`  [ingest] Uploading to s3://${S3_BUCKET}/raw/${file.name} ...`);
      const manifest = await uploadDriveFileToS3(drive, file);
      results.uploaded.push(file.name);
      console.log(`  [ingest] Upload complete (sha256: ${manifest.sha256.slice(0, 12)}...)`);

      // Import S3 → staging
      console.log(`  [staging] Importing s3://${S3_BUCKET}/raw/${file.name} → readings_import_staging ...`);
      const importResult = await importFileToStaging(dbClient, `raw/${file.name}`);
      results.imported.push(importResult);
      console.log(`  [staging] Done: ${importResult.processedRows} rows processed, ${importResult.insertedRows} inserted`);
    }
  } finally {
    await dbClient.end();
  }

  console.log('\n[pipeline] Summary:');
  console.log(JSON.stringify({
    skipped: results.skipped,
    uploaded: results.uploaded,
    imported: results.imported,
  }, null, 2));

  if (results.uploaded.length === 0 && results.skipped.length > 0) {
    console.log('[pipeline] No files had changes. Nothing to do.');
  }
}

main().catch((err) => {
  console.error('[pipeline] Fatal error:', err);
  process.exit(1);
});
