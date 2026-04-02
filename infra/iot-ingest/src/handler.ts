import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Client } from 'pg';
import { getPgSslOptionsForRds } from './rds-ssl';

const s3 = new S3Client({ region: 'us-east-1' });

const BUCKET = process.env.INGEST_BUCKET!;
const PREFIX = 'raw/iot/powercenter/data';

const dbConfig = {
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME!,
  user: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  ssl:
    process.env.NODE_ENV === 'production'
      ? getPgSslOptionsForRds()
      : undefined,
};

// ── Key variables to extract from the 451 available ─────
// Maps internal_name → column name in iot_readings
const VARIABLE_MAP: Record<string, string> = {
  'V_LN/Inst/Value/L1N': 'voltage_l1',
  'V_LN/Inst/Value/L2N': 'voltage_l2',
  'V_LN/Inst/Value/L3N': 'voltage_l3',
  'V_LN/Aggregation1/Value/AVG': 'voltage_avg',
  'I/Inst/Value/L1': 'current_l1',
  'I/Inst/Value/L2': 'current_l2',
  'I/Inst/Value/L3': 'current_l3',
  'I/Aggregation1/Value/AVG': 'current_avg',
  'Power/W/Inst/Value/Sum': 'active_power_w',
  'Power/W/Inst/Value/L1': 'active_power_l1_w',
  'Power/W/Inst/Value/L2': 'active_power_l2_w',
  'Power/W/Inst/Value/L3': 'active_power_l3_w',
  'Power/var/Q1/Inst/Value/Sum': 'reactive_power_var',
  'Power/VA/Inst/Value/Sum': 'apparent_power_va',
  'Power/Factor/Inst/Value/AVG': 'power_factor',
  'Power/Factor/Inst/Value/L1': 'power_factor_l1',
  'Power/Factor/Inst/Value/L2': 'power_factor_l2',
  'Power/Factor/Inst/Value/L3': 'power_factor_l3',
  'Frequency/Inst/Value/Common': 'frequency_hz',
  'Energy/Wh/Import/OnPeakTariff/Sum': 'energy_import_wh',
  'Energy/Wh/Export/OnPeakTariff/Sum': 'energy_export_wh',
  'Energy/varh/Import/OnPeakTariff/Sum': 'reactive_energy_import_varh',
  'THD/V_LN/Inst/Value/L1N#': 'thd_voltage_l1_pct',
  'THD/V_LN/Inst/Value/L2N#': 'thd_voltage_l2_pct',
  'THD/V_LN/Inst/Value/L3N#': 'thd_voltage_l3_pct',
  'THD/I/Inst/Value/L2#': 'thd_current_l1_pct',
  'THD/I/Inst/Value/L3#': 'thd_current_l2_pct',
  'Power/W/MeanValue/Max/Sum': 'peak_demand_w',
};

const COLUMNS = Object.values(VARIABLE_MAP);

interface PocItem {
  internal_name: string;
  value: string;
  unit: string;
  quality: string;
  display_name?: string;
  name?: string;
  id?: number;
}

interface PocMessage {
  item_id: string;
  item_name: string;
  timestamp: string;
  count: number;
  _embedded: { item: PocItem[] };
  mqtt_topic: string;
  received_at: number;
}

// ── Create table if not exists ──────────────────────────
const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS iot_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  device_name VARCHAR(200) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  s3_key TEXT,
  voltage_l1 NUMERIC(7,2),
  voltage_l2 NUMERIC(7,2),
  voltage_l3 NUMERIC(7,2),
  voltage_avg NUMERIC(7,2),
  current_l1 NUMERIC(8,3),
  current_l2 NUMERIC(8,3),
  current_l3 NUMERIC(8,3),
  current_avg NUMERIC(8,3),
  active_power_w NUMERIC(12,3),
  active_power_l1_w NUMERIC(12,3),
  active_power_l2_w NUMERIC(12,3),
  active_power_l3_w NUMERIC(12,3),
  reactive_power_var NUMERIC(12,3),
  apparent_power_va NUMERIC(12,3),
  power_factor NUMERIC(5,3),
  power_factor_l1 NUMERIC(5,3),
  power_factor_l2 NUMERIC(5,3),
  power_factor_l3 NUMERIC(5,3),
  frequency_hz NUMERIC(6,3),
  energy_import_wh NUMERIC(16,3),
  energy_export_wh NUMERIC(16,3),
  reactive_energy_import_varh NUMERIC(16,3),
  thd_voltage_l1_pct NUMERIC(5,2),
  thd_voltage_l2_pct NUMERIC(5,2),
  thd_voltage_l3_pct NUMERIC(5,2),
  thd_current_l1_pct NUMERIC(5,2),
  thd_current_l2_pct NUMERIC(5,2),
  thd_current_l3_pct NUMERIC(5,2),
  peak_demand_w NUMERIC(12,3),
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iot_readings_ts
  ON iot_readings (timestamp DESC);
`;

const ENSURE_UNIQUE = `
-- Remove duplicates keeping lowest id
DELETE FROM iot_readings a
  USING iot_readings b
  WHERE a.device_id = b.device_id
    AND a.timestamp = b.timestamp
    AND a.id > b.id;

-- Drop old non-unique index if exists
DROP INDEX IF EXISTS idx_iot_readings_device_ts;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_iot_readings_device_ts
  ON iot_readings (device_id, timestamp);
`;

// ── Parse POC3000 message ───────────────────────────────
const parseMessage = (msg: PocMessage, s3Key: string) => {
  const values: Record<string, number | null> = {};
  for (const col of COLUMNS) values[col] = null;

  for (const item of msg._embedded.item) {
    const col = VARIABLE_MAP[item.internal_name];
    if (col && item.quality === 'valid') {
      const num = parseFloat(item.value);
      if (!isNaN(num)) values[col] = num;
    }
  }

  return {
    device_id: msg.item_id,
    device_name: msg.item_name,
    timestamp: msg.timestamp,
    s3_key: s3Key,
    ...values,
    raw_json: msg,
  };
};

// ── Get S3 object as JSON ───────────────────────────────
const getS3Json = async (key: string): Promise<PocMessage> => {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await res.Body!.transformToString();
  return JSON.parse(body);
};

// ── List S3 keys for a date ─────────────────────────────
const listKeys = async (date: string): Promise<string[]> => {
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `${PREFIX}/${date}/`,
      ContinuationToken: token,
    }));
    for (const obj of res.Contents || []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);

  return keys;
};

// ── Main handler ────────────────────────────────────────
// Triggered by EventBridge every 15 minutes
// Processes all new S3 files not yet in the DB

export const handler = async () => {
  const log: string[] = [];
  const db = new Client(dbConfig);

  try {
    await db.connect();
    log.push('Connected to DB');

    // Create table if needed
    await db.query(CREATE_TABLE);
    await db.query(ENSURE_UNIQUE);
    log.push('Table iot_readings ensured (unique constraint)');

    // Get last processed timestamp
    const lastRow = await db.query(
      'SELECT MAX(timestamp) as last_ts FROM iot_readings WHERE device_id = $1',
      ['6ab27db7-0a61-40c2-8a93-35e9e2376683']
    );
    const lastTs = lastRow.rows[0]?.last_ts;
    log.push(`Last processed: ${lastTs || 'none'}`);

    // List files for today and yesterday (in case of timezone edge)
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const allKeys = [
      ...(await listKeys(yesterday)),
      ...(await listKeys(today)),
    ];
    log.push(`S3 files found: ${allKeys.length}`);

    // Process new files
    let inserted = 0;
    let skipped = 0;

    for (const key of allKeys) {
      try {
        const msg = await getS3Json(key);
        const parsed = parseMessage(msg, key);

        // Skip if already processed (by timestamp + device_id)
        if (lastTs && new Date(parsed.timestamp) <= new Date(lastTs)) {
          skipped++;
          continue;
        }

        const cols = ['device_id', 'device_name', 'timestamp', 's3_key', ...COLUMNS, 'raw_json'];
        const vals = cols.map((_, i) => `$${i + 1}`);

        const result = await db.query(
          `INSERT INTO iot_readings (${cols.join(', ')}) VALUES (${vals.join(', ')})
           ON CONFLICT (device_id, "timestamp") DO NOTHING`,
          [
            parsed.device_id,
            parsed.device_name,
            parsed.timestamp,
            parsed.s3_key,
            ...COLUMNS.map(c => (parsed as Record<string, unknown>)[c] ?? null),
            JSON.stringify(parsed.raw_json),
          ]
        );
        if (result.rowCount && result.rowCount > 0) inserted++;
        else skipped++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown';
        log.push(`Error processing ${key}: ${msg}`);
      }
    }

    log.push(`Inserted: ${inserted}, Skipped: ${skipped}`);

    return { statusCode: 200, body: log };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    log.push(`Fatal: ${msg}`);
    return { statusCode: 500, body: log };
  } finally {
    await db.end().catch(() => {});
  }
};
