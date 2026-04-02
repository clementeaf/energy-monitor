/**
 * Backfill voltage, current, frequency into meter_readings from S3 CSVs.
 * Strategy: stream CSV → session-scoped TEMP table → UPDATE per meter partition.
 * Much faster than VALUES-based UPDATE on partitioned tables.
 *
 * Invoke: { "key": "raw/MALL_MEDIANO_254_completo.csv" }
 * Split large files: { "key": "raw/MALL_GRANDE_446_completo.csv", "fromMeter": "MG-044", "toMeter": "MG-200" }
 * Or without key to process all CSVs in raw/.
 *
 * Env: DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD, S3_BUCKET
 */
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import { parse } from 'csv-parse';
import pg from 'pg';

const { Client } = pg;
const BUCKET = process.env.S3_BUCKET || 'energy-monitor-ingest-058310292956';
const INSERT_BATCH = 5000;
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

function dec(v) {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

async function processCSV(client, bucket, key, fromMeter = null, toMeter = null) {
  const rangeLabel = fromMeter || toMeter ? ` [${fromMeter || '*'}..${toMeter || '*'}]` : '';
  console.log(`Processing ${key}${rangeLabel}...`);
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`No body for ${key}`);

  // 1. Create temp table (session-scoped — no race condition between concurrent invocations)
  await client.query(`
    CREATE TEMP TABLE _vcf_tmp (
      meter_id varchar(20),
      ts timestamptz,
      v1 numeric, v2 numeric, v3 numeric,
      c1 numeric, c2 numeric, c3 numeric,
      freq numeric
    )
  `);

  // 2. Stream CSV → temp table
  const parser = parse({
    bom: true,
    columns: (h) => h.map((c) => c.trim().replace(/^\uFEFF/, '')),
    delimiter: ';',
    skip_empty_lines: true,
    trim: true,
  });

  let batch = [];
  let rowNum = 0;
  let inserted = 0;

  async function flushInsert() {
    if (batch.length === 0) return;
    const cols = 9;
    const placeholders = batch.map((_, i) => {
      const b = i * cols;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9})`;
    });
    const params = batch.flatMap((r) => [r.meter_id, r.ts, r.v1, r.v2, r.v3, r.c1, r.c2, r.c3, r.freq]);
    await client.query(
      `INSERT INTO _vcf_tmp (meter_id,ts,v1,v2,v3,c1,c2,c3,freq) VALUES ${placeholders.join(',')}`,
      params,
    );
    inserted += batch.length;
    batch = [];
  }

  res.Body.pipe(parser);
  for await (const rec of parser) {
    rowNum++;
    const v1 = dec(rec.voltage_L1);
    if (v1 == null) continue;
    // Filter by meter range if specified
    if (fromMeter && rec.meter_id < fromMeter) continue;
    if (toMeter && rec.meter_id > toMeter) continue;

    batch.push({
      meter_id: rec.meter_id,
      ts: rec.timestamp,
      v1,
      v2: dec(rec.voltage_L2),
      v3: dec(rec.voltage_L3),
      c1: dec(rec.current_L1),
      c2: dec(rec.current_L2),
      c3: dec(rec.current_L3),
      freq: dec(rec.frequency_Hz),
    });

    if (batch.length >= INSERT_BATCH) {
      await flushInsert();
      if (inserted % 500000 < INSERT_BATCH) {
        console.log(`  Loading: ${rowNum} CSV rows, ${inserted} staged`);
      }
    }
  }
  await flushInsert();
  console.log(`  Staged ${inserted} rows from ${rowNum} CSV rows`);

  // 3. Index temp table for fast joins
  await client.query('CREATE INDEX ON _vcf_tmp (meter_id, ts)');
  console.log('  Temp table indexed');

  // 4. UPDATE per meter (hits single partition each time → fast)
  const { rows: meters } = await client.query(
    'SELECT DISTINCT meter_id FROM _vcf_tmp ORDER BY meter_id',
  );
  console.log(`  Updating ${meters.length} meters...`);

  let totalUpdated = 0;
  for (let i = 0; i < meters.length; i++) {
    const mid = meters[i].meter_id;
    const upd = await client.query(`
      UPDATE meter_readings mr
      SET voltage_l1 = t.v1, voltage_l2 = t.v2, voltage_l3 = t.v3,
          current_l1 = t.c1, current_l2 = t.c2, current_l3 = t.c3,
          frequency_hz = t.freq
      FROM _vcf_tmp t
      WHERE mr.meter_id = t.meter_id AND mr.timestamp = t.ts
        AND mr.meter_id = $1
        AND mr.voltage_l1 IS NULL
    `, [mid]);
    totalUpdated += upd.rowCount || 0;
    if ((i + 1) % 50 === 0 || i === meters.length - 1) {
      console.log(`  ${i + 1}/${meters.length} meters done, ${totalUpdated} rows updated`);
    }
  }

  await client.query('DROP TABLE IF EXISTS _vcf_tmp');
  console.log(`  ${key}: DONE — ${totalUpdated} rows updated`);
  return { key, rowsRead: rowNum, rowsStaged: inserted, rowsUpdated: totalUpdated };
}

export async function handler(event) {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'energy_monitor',
    user: process.env.DB_USERNAME || 'emadmin',
    password: process.env.DB_PASSWORD,
    ssl: getPgSslOptionsForRds(),
  });
  await client.connect();

  const results = [];
  try {
    const fromMeter = event?.fromMeter || null;
    const toMeter = event?.toMeter || null;
    if (event?.key) {
      results.push(await processCSV(client, BUCKET, event.key, fromMeter, toMeter));
    } else {
      const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'raw/' }));
      const keys = (list.Contents || []).map((o) => o.Key).filter((k) => k?.endsWith('.csv'));
      console.log(`Processing ${keys.length} CSVs: ${keys.join(', ')}`);
      for (const k of keys) {
        results.push(await processCSV(client, BUCKET, k));
      }
    }

    // Verify
    const { rows: check } = await client.query(`
      SELECT
        LEFT(meter_id, CASE WHEN meter_id LIKE 'SC5%' THEN 4 ELSE 2 END) AS bldg,
        COUNT(*)::bigint AS total,
        COUNT(voltage_l1)::bigint AS has_v,
        COUNT(current_l1)::bigint AS has_c,
        COUNT(frequency_hz)::bigint AS has_f
      FROM meter_readings
      GROUP BY 1 ORDER BY 1
    `);
    console.log('Verification:');
    for (const r of check) {
      console.log(`  ${r.bldg}: total=${r.total} voltage=${r.has_v} current=${r.has_c} freq=${r.has_f}`);
    }

    return { statusCode: 200, body: { results, verification: check } };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: { error: err.message, results } };
  } finally {
    await client.end();
  }
}
