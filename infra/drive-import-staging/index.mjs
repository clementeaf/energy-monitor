import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { parse } from 'csv-parse';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const S3_BUCKET = process.env.S3_BUCKET || 'energy-monitor-ingest-058310292956';
const S3_KEY = process.env.S3_KEY || 'raw/MALL_GRANDE_446_completo.csv';
const LIMIT_ROWS = parseLimit(process.env.LIMIT_ROWS);
const BATCH_SIZE = parsePositiveInt(process.env.BATCH_SIZE, 1000);
const TRUNCATE_BEFORE_LOAD = process.env.TRUNCATE_BEFORE_LOAD === 'true';
const FROM_DATE = process.env.FROM_DATE || null;
const TO_DATE = process.env.TO_DATE || null;
const CSV_ENCODING = (process.env.CSV_ENCODING || 'utf8').toLowerCase();

const REQUIRED_HEADERS = [
  'timestamp',
  'meter_id',
  'center_name',
  'center_type',
  'store_type',
  'store_name',
  'model',
  'phase_type',
  'uplink_route',
  'modbus_address',
  'voltage_L1',
  'voltage_L2',
  'voltage_L3',
  'current_L1',
  'current_L2',
  'current_L3',
  'power_kW',
  'reactive_power_kvar',
  'power_factor',
  'frequency_Hz',
  'energy_kWh_total',
];

const INSERT_COLUMNS = [
  'source_file',
  'source_bucket',
  'source_key',
  'source_row_number',
  'timestamp',
  'meter_id',
  'center_name',
  'center_type',
  'store_type',
  'store_name',
  'model',
  'phase_type',
  'uplink_route',
  'modbus_address',
  'voltage_l1',
  'voltage_l2',
  'voltage_l3',
  'current_l1',
  'current_l2',
  'current_l3',
  'power_kw',
  'reactive_power_kvar',
  'power_factor',
  'frequency_hz',
  'energy_kwh_total',
];

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const EXPECTED_PHASE_BY_MODEL = {
  PAC1670: '3P',
  PAC1651: '1P',
};

const secretsClient = new SecretsManagerClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLimit(value) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalText(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function parseRequiredText(value, fieldName, rowNumber) {
  const parsed = parseOptionalText(value);
  if (parsed == null) {
    throw new Error(`Row ${rowNumber}: ${fieldName} is required`);
  }

  return parsed;
}

function parseDecimal(value, fieldName, rowNumber, { required = false, integer = false } = {}) {
  const parsed = parseOptionalText(value);
  if (parsed == null) {
    if (required) {
      throw new TypeError(`Row ${rowNumber}: ${fieldName} is required`);
    }
    return null;
  }

  const normalized = parsed.replace(',', '.');
  const numberValue = integer ? Number.parseInt(normalized, 10) : Number(normalized);
  if (Number.isNaN(numberValue)) {
    throw new TypeError(`Row ${rowNumber}: ${fieldName} is not numeric`);
  }

  return numberValue;
}

function parseTimestamp(value, rowNumber) {
  const parsed = parseRequiredText(value, 'timestamp', rowNumber);
  const timestamp = new Date(parsed);
  if (Number.isNaN(timestamp.getTime())) {
    throw new TypeError(`Row ${rowNumber}: timestamp is invalid`);
  }

  return timestamp.toISOString();
}

function normalizeRecord(record, sourceFile, rowNumber) {
  return {
    source_file: sourceFile,
    source_bucket: S3_BUCKET,
    source_key: S3_KEY,
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
    throw new TypeError(`Row ${record.source_row_number}: power_kW cannot be negative`);
  }

  const expectedPhase = EXPECTED_PHASE_BY_MODEL[record.model];
  if (expectedPhase && record.phase_type !== expectedPhase) {
    throw new TypeError(
      `Row ${record.source_row_number}: model ${record.model} must use phase_type ${expectedPhase}`,
    );
  }

  if (
    record.phase_type === '1P' &&
    (record.voltage_l2 != null || record.voltage_l3 != null || record.current_l2 != null || record.current_l3 != null)
  ) {
    throw new TypeError(`Row ${record.source_row_number}: 1P rows must keep L2/L3 voltage and current empty`);
  }

  const previous = state.byMeter.get(record.meter_id);
  if (previous) {
    const deltaMs = Date.parse(record.timestamp) - Date.parse(previous.timestamp);
    if (deltaMs <= 0) {
      console.warn(`Row ${record.source_row_number}: timestamp is not strictly ascending for meter ${record.meter_id} (skipping)`);
      return false;
    }

    if (deltaMs !== FIFTEEN_MINUTES_MS) {
      state.timestampStepMismatches += 1;
    }

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

function inDateRange(tsIso, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const t = new Date(tsIso).getTime();
  if (fromDate && t < new Date(fromDate).getTime()) return false;
  if (toDate && t > new Date(toDate).getTime()) return false;
  return true;
}

async function getSecretJson(secretId) {
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) {
    throw new Error(`Secret ${secretId} does not contain SecretString`);
  }

  return JSON.parse(response.SecretString);
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

function assertHeaders(columns) {
  const normalized = new Set(columns.map((value) => value.trim().replace(/^\uFEFF/, '')));
  const missing = REQUIRED_HEADERS.filter((header) => !normalized.has(header));
  if (missing.length > 0) {
    throw new Error(`CSV header is missing required columns: ${missing.join(', ')}`);
  }
}

function buildInsertStatement(rowCount) {
  const placeholders = [];
  let parameterIndex = 1;
  const columnCount = INSERT_COLUMNS.length;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const rowPlaceholders = [];
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      rowPlaceholders.push(`$${parameterIndex++}`);
    }
    placeholders.push(`(${rowPlaceholders.join(', ')})`);
  }

  return `INSERT INTO readings_import_staging (${INSERT_COLUMNS.join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (meter_id, timestamp, source_file) DO NOTHING`;
}

async function flushBatch(client, batch) {
  if (batch.length === 0) {
    return 0;
  }

  const params = [];
  for (const row of batch) {
    for (const column of INSERT_COLUMNS) {
      params.push(row[column]);
    }
  }

  const sql = buildInsertStatement(batch.length);
  const result = await client.query(sql, params);
  console.log(`Flushed batch of ${batch.length} row(s)`);
  batch.length = 0;
  return result.rowCount || 0;
}

async function main() {
  console.log(`Loading s3://${S3_BUCKET}/${S3_KEY}`);
  const [dbSecret, s3Object] = await Promise.all([
    getSecretJson(DB_SECRET_NAME),
    s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY })),
  ]);

  if (!s3Object.Body) {
    throw new Error(`S3 object s3://${S3_BUCKET}/${S3_KEY} has no body`);
  }

  const client = new Client(buildDbConfig(dbSecret));
  await client.connect();
  console.log('Connected to staging database');

  try {
    if (TRUNCATE_BEFORE_LOAD) {
      await client.query('TRUNCATE TABLE readings_import_staging');
      console.log('Truncated readings_import_staging');
    }

    const sourceFile = S3_KEY.split('/').pop() || S3_KEY;
    const parser = parse({
      bom: true,
      encoding: CSV_ENCODING === 'latin1' ? 'latin1' : 'utf8',
      columns: (header) => {
        assertHeaders(header);
        return header.map((value) => value.trim().replace(/^\uFEFF/, ''));
      },
      delimiter: ';',
      skip_empty_lines: true,
      trim: true,
    });

    const batch = [];
    let rowNumber = 0;
    let insertedRows = 0;
    const validationState = {
      byMeter: new Map(),
      timestampStepMismatches: 0,
      uniqueMeters: new Set(),
    };

    s3Object.Body.pipe(parser);
    console.log('Started CSV parse stream');

    try {
      for await (const record of parser) {
        rowNumber += 1;
        const normalized = normalizeRecord(record, sourceFile, rowNumber);
        if (FROM_DATE || TO_DATE) {
          if (!inDateRange(normalized.timestamp, FROM_DATE, TO_DATE)) continue;
        }
        const isValid = validateRecord(normalized, validationState);
        if (isValid) {
          batch.push(normalized);
        }

        if (LIMIT_ROWS && rowNumber >= LIMIT_ROWS) {
          parser.destroy();
          break;
        }

        if (batch.length >= BATCH_SIZE) {
          insertedRows += await flushBatch(client, batch);
        }
      }
    } catch (error) {
      if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        throw error;
      }
    }

    if (batch.length > 0) {
      insertedRows += await flushBatch(client, batch);
    }

    console.log(JSON.stringify({
      bucket: S3_BUCKET,
      key: S3_KEY,
      processedRows: rowNumber,
      insertedRows,
      limitRows: LIMIT_ROWS,
      batchSize: BATCH_SIZE,
      truncatedBeforeLoad: TRUNCATE_BEFORE_LOAD,
      fromDate: FROM_DATE || null,
      toDate: TO_DATE || null,
      uniqueMeters: validationState.uniqueMeters.size,
      timestampStepMismatches: validationState.timestampStepMismatches,
    }, null, 2));
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  console.error('[drive-import-staging]', error);
  process.exit(1);
}