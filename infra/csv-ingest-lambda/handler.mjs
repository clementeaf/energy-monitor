/**
 * Lambda: consume CSV desde S3 (ventana 2 meses), insertar en staging, catalog y promote a readings.
 * Event: { bucket?, key?, fromDate?, toDate? } (ISO). Env: S3_BUCKET, DB_SECRET_NAME, FROM_DATE, TO_DATE, BATCH_SIZE.
 */

import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getPgSslOptionsForRds } from './rds-ssl.mjs';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { parse } from 'csv-parse';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'energy-monitor-ingest-058310292956';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const BATCH_SIZE = Math.max(500, parseInt(process.env.BATCH_SIZE || '2000', 10));
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const EXPECTED_PHASE_BY_MODEL = { PAC1670: '3P', PAC1651: '1P' };

const REQUIRED_HEADERS = [
  'timestamp', 'meter_id', 'center_name', 'center_type', 'store_type', 'store_name',
  'model', 'phase_type', 'uplink_route', 'modbus_address',
  'voltage_L1', 'voltage_L2', 'voltage_L3', 'current_L1', 'current_L2', 'current_L3',
  'power_kW', 'reactive_power_kvar', 'power_factor', 'frequency_Hz', 'energy_kWh_total',
];

const INSERT_COLUMNS = [
  'source_file', 'source_bucket', 'source_key', 'source_row_number', 'timestamp', 'meter_id',
  'center_name', 'center_type', 'store_type', 'store_name', 'model', 'phase_type',
  'uplink_route', 'modbus_address', 'voltage_l1', 'voltage_l2', 'voltage_l3',
  'current_l1', 'current_l2', 'current_l3', 'power_kw', 'reactive_power_kvar',
  'power_factor', 'frequency_hz', 'energy_kwh_total',
];

const secretsClient = new SecretsManagerClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });

function parseOptionalText(value) {
  if (value == null) return null;
  const t = String(value).trim();
  return t === '' ? null : t;
}

function parseRequiredText(value, fieldName, rowNumber) {
  const p = parseOptionalText(value);
  if (p == null) throw new Error(`Row ${rowNumber}: ${fieldName} is required`);
  return p;
}

function parseDecimal(value, fieldName, rowNumber, { required = false, integer = false } = {}) {
  const p = parseOptionalText(value);
  if (p == null) {
    if (required) throw new TypeError(`Row ${rowNumber}: ${fieldName} is required`);
    return null;
  }
  const n = p.replace(',', '.');
  const v = integer ? parseInt(n, 10) : Number(n);
  if (Number.isNaN(v)) throw new TypeError(`Row ${rowNumber}: ${fieldName} is not numeric`);
  return v;
}

function parseTimestamp(value, rowNumber) {
  const p = parseRequiredText(value, 'timestamp', rowNumber);
  const d = new Date(p);
  if (Number.isNaN(d.getTime())) throw new TypeError(`Row ${rowNumber}: timestamp is invalid`);
  return d.toISOString();
}

function normalizeRecord(record, sourceFile, sourceKey, bucket, rowNumber) {
  return {
    source_file: sourceFile,
    source_bucket: bucket,
    source_key: sourceKey,
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
  if (record.power_kw < 0) throw new TypeError(`Row ${record.source_row_number}: power_kW cannot be negative`);
  const expectedPhase = EXPECTED_PHASE_BY_MODEL[record.model];
  if (expectedPhase && record.phase_type !== expectedPhase)
    throw new TypeError(`Row ${record.source_row_number}: model ${record.model} must use phase_type ${expectedPhase}`);
  if (record.phase_type === '1P' && (record.voltage_l2 != null || record.voltage_l3 != null || record.current_l2 != null || record.current_l3 != null))
    throw new TypeError(`Row ${record.source_row_number}: 1P rows must keep L2/L3 empty`);
  const prev = state.byMeter.get(record.meter_id);
  if (prev) {
    const deltaMs = Date.parse(record.timestamp) - Date.parse(prev.timestamp);
    if (deltaMs <= 0) return false;
    if (record.energy_kwh_total < prev.energyKwhTotal) return false;
  }
  state.byMeter.set(record.meter_id, { timestamp: record.timestamp, energyKwhTotal: record.energy_kwh_total });
  state.uniqueMeters.add(record.meter_id);
  return true;
}

function assertHeaders(columns) {
  const set = new Set(columns.map((c) => c.trim().replace(/^\uFEFF/, '')));
  const missing = REQUIRED_HEADERS.filter((h) => !set.has(h));
  if (missing.length) throw new Error(`CSV missing columns: ${missing.join(', ')}`);
}

function buildInsertStatement(rowCount) {
  const placeholders = [];
  let i = 1;
  for (let r = 0; r < rowCount; r++) {
    placeholders.push('(' + INSERT_COLUMNS.map(() => `$${i++}`).join(', ') + ')');
  }
  return `INSERT INTO readings_import_staging (${INSERT_COLUMNS.join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (meter_id, timestamp, source_file) DO NOTHING`;
}

async function getSecretJson(secretId) {
  const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!res.SecretString) throw new Error(`Secret ${secretId} has no SecretString`);
  return JSON.parse(res.SecretString);
}

function buildDbConfig(secret) {
  return {
    host: process.env.DB_HOST || secret.host || secret.DB_HOST,
    port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
    database: secret.dbname || secret.database || secret.DB_NAME,
    user: secret.username || secret.user || secret.DB_USERNAME,
    password: secret.password || secret.DB_PASSWORD,
    ssl: getPgSslOptionsForRds(),
  };
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Filtra filas cuyo timestamp está en [fromDate, toDate] (inclusive). Fechas en ISO.
 */
function inDateRange(tsIso, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const t = new Date(tsIso).getTime();
  if (fromDate && t < new Date(fromDate).getTime()) return false;
  if (toDate && t > new Date(toDate).getTime()) return false;
  return true;
}

async function flushBatch(client, batch) {
  if (batch.length === 0) return 0;
  const params = batch.flatMap((row) => INSERT_COLUMNS.map((col) => row[col]));
  const sql = buildInsertStatement(batch.length);
  const result = await client.query(sql, params);
  batch.length = 0;
  return result.rowCount || 0;
}

/**
 * Descarga CSV de S3, filtra por ventana de fechas, inserta en readings_import_staging.
 */
async function loadFromS3ToStaging(client, bucket, key, fromDate, toDate) {
  const res = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`S3 s3://${bucket}/${key} has no body`);

  const sourceFile = key.split('/').pop() || key;
  const parser = parse({
    bom: true,
    columns: (header) => {
      assertHeaders(header);
      return header.map((c) => c.trim().replace(/^\uFEFF/, ''));
    },
    delimiter: ';',
    skip_empty_lines: true,
    trim: true,
  });

  const batch = [];
  let rowNumber = 0;
  let insertedRows = 0;
  const state = { byMeter: new Map(), uniqueMeters: new Set() };

  res.Body.pipe(parser);
  for await (const record of parser) {
    rowNumber += 1;
    const normalized = normalizeRecord(record, sourceFile, key, bucket, rowNumber);
    if (!inDateRange(normalized.timestamp, fromDate, toDate)) continue;
    if (!validateRecord(normalized, state)) continue;
    batch.push(normalized);
    if (batch.length >= BATCH_SIZE) insertedRows += await flushBatch(client, batch);
  }
  if (batch.length) insertedRows += await flushBatch(client, batch);

  return { processedRows: rowNumber, insertedRows, uniqueMeters: state.uniqueMeters.size };
}

/**
 * Catalog: buildings, meters, staging_centers desde staging.
 */
async function runCatalog(client) {
  const buildings = (await client.query(`
    SELECT DISTINCT center_name, center_type FROM readings_import_staging ORDER BY center_name
  `)).rows;
  const meters = (await client.query(`
    SELECT DISTINCT ON (meter_id) meter_id, center_name, model, phase_type, uplink_route, modbus_address
    FROM readings_import_staging ORDER BY meter_id, source_row_number
  `)).rows;

  const existingBuildings = new Set((await client.query('SELECT id FROM buildings')).rows.map((r) => r.id));
  const existingMeters = new Set((await client.query('SELECT id FROM meters')).rows.map((r) => r.id));

  for (const b of buildings) {
    const id = slugify(b.center_name);
    if (existingBuildings.has(id)) continue;
    await client.query(
      `INSERT INTO buildings (id, name, address, total_area, center_type) VALUES ($1, $2, '', 0, $3) ON CONFLICT (id) DO NOTHING`,
      [id, b.center_name, b.center_type || '']
    );
    existingBuildings.add(id);
  }

  for (const m of meters) {
    if (existingMeters.has(m.meter_id)) continue;
    const buildingId = slugify(m.center_name);
    await client.query(
      `INSERT INTO meters (id, building_id, model, phase_type, bus_id, modbus_address, uplink_route, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'online') ON CONFLICT (id) DO NOTHING`,
      [m.meter_id, buildingId, m.model, m.phase_type, `${buildingId}-Bus1`, m.modbus_address, m.uplink_route]
    );
    existingMeters.add(m.meter_id);
  }

  const meterCountByBuilding = meters.reduce((acc, m) => {
    const bid = slugify(m.center_name);
    acc[bid] = (acc[bid] || 0) + 1;
    return acc;
  }, {});
  await client.query('TRUNCATE staging_centers');
  for (const b of buildings) {
    const id = slugify(b.center_name);
    await client.query(
      `INSERT INTO staging_centers (id, center_name, center_type, meters_count, updated_at)
       VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (id) DO UPDATE SET center_name = EXCLUDED.center_name, center_type = EXCLUDED.center_type, meters_count = EXCLUDED.meters_count, updated_at = NOW()`,
      [id, b.center_name, b.center_type || '', meterCountByBuilding[id] || 0]
    );
  }
  return { buildings: buildings.length, meters: meters.length };
}

/**
 * Promote: readings_import_staging → readings (batches, NOT EXISTS).
 */
async function runPromote(client) {
  const files = (await client.query(`
    SELECT source_file, COUNT(*)::bigint AS row_count FROM readings_import_staging GROUP BY source_file ORDER BY source_file
  `)).rows;
  let totalPromoted = 0;
  for (const file of files) {
    const fileName = file.source_file;
    const { rows: [{ min_id, max_id }] } = await client.query(
      `SELECT MIN(id) AS min_id, MAX(id) AS max_id FROM readings_import_staging WHERE source_file = $1`,
      [fileName]
    );
    let currentId = Number(min_id);
    const maxId = Number(max_id);
    while (currentId <= maxId) {
      const batchEnd = currentId + BATCH_SIZE;
      const result = await client.query(`
        INSERT INTO readings (meter_id, timestamp, voltage_l1, voltage_l2, voltage_l3, current_l1, current_l2, current_l3, power_kw, reactive_power_kvar, power_factor, frequency_hz, energy_kwh_total)
        SELECT s.meter_id, s.timestamp, s.voltage_l1, s.voltage_l2, s.voltage_l3, s.current_l1, s.current_l2, s.current_l3, s.power_kw, s.reactive_power_kvar, s.power_factor, s.frequency_hz, s.energy_kwh_total
        FROM readings_import_staging s
        WHERE s.source_file = $1 AND s.id >= $2 AND s.id < $3
          AND NOT EXISTS (SELECT 1 FROM readings r WHERE r.meter_id = s.meter_id AND r.timestamp = s.timestamp)
      `, [fileName, currentId, batchEnd]);
      totalPromoted += result.rowCount || 0;
      currentId = batchEnd;
    }
  }
  await client.query(`
    UPDATE meters m SET last_reading_at = sub.max_ts, status = 'online'
    FROM (SELECT meter_id, MAX(timestamp) AS max_ts FROM readings WHERE meter_id IN (SELECT DISTINCT meter_id FROM readings_import_staging) GROUP BY meter_id) sub
    WHERE m.id = sub.meter_id
  `);
  return { totalPromoted };
}

export async function handler(event, context) {
  const bucket = event?.bucket || event?.S3_BUCKET || process.env.S3_BUCKET || S3_BUCKET;
  const key = event?.key || event?.S3_KEY || null;
  const fromDate = event?.fromDate || process.env.FROM_DATE || null;
  const toDate = event?.toDate || process.env.TO_DATE || null;

  const result = { ingested: [], catalog: null, promote: null, error: null };

  const secret = await getSecretJson(DB_SECRET_NAME);
  const client = new Client(buildDbConfig(secret));
  await client.connect();

  try {
    if (key) {
      const ingest = await loadFromS3ToStaging(client, bucket, key, fromDate, toDate);
      result.ingested.push({ key, ...ingest });
    } else {
      const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'raw/' }));
      const keys = (listRes.Contents || []).map((o) => o.Key).filter((k) => k && k.endsWith('.csv'));
      for (const k of keys) {
        const ingest = await loadFromS3ToStaging(client, bucket, k, fromDate, toDate);
        result.ingested.push({ key: k, ...ingest });
      }
    }

    if (result.ingested.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No CSV keys to process', result }) };
    }

    const stagingCount = (await client.query('SELECT COUNT(*)::bigint AS n FROM readings_import_staging')).rows[0].n;
    if (Number(stagingCount) === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: 'Staging empty after ingest', result }) };
    }

    result.catalog = await runCatalog(client);
    result.promote = await runPromote(client);
  } catch (err) {
    result.error = err.message;
    console.error('[csv-ingest-lambda]', err);
    throw err;
  } finally {
    await client.end();
  }

  return { statusCode: 200, body: JSON.stringify(result) };
}
