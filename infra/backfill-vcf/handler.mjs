/**
 * Backfill voltage, current, frequency into meter_readings from S3 CSVs.
 * Streams CSV, collects batches per meter, UPDATEs via temp table + JOIN.
 *
 * Invoke: { "key": "raw/MALL_MEDIANO_254_completo.csv" }
 * Or without key to process all CSVs in raw/.
 *
 * Env: DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD, S3_BUCKET
 */
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { parse } from 'csv-parse';
import pg from 'pg';

const { Client } = pg;
const BUCKET = process.env.S3_BUCKET || 'energy-monitor-ingest-058310292956';
const BATCH_SIZE = 500;
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

function dec(v) {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

async function processCSV(client, bucket, key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`No body for ${key}`);

  const parser = parse({
    bom: true,
    columns: (h) => h.map((c) => c.trim().replace(/^\uFEFF/, '')),
    delimiter: ';',
    skip_empty_lines: true,
    trim: true,
  });

  let batch = [];
  let totalUpdated = 0;
  let rowNum = 0;

  async function flushBatch() {
    if (batch.length === 0) return;
    const placeholders = batch.map((_, i) => {
      const b = i * 9;
      return `($${b+1}::varchar,$${b+2}::timestamptz,$${b+3}::numeric,$${b+4}::numeric,$${b+5}::numeric,$${b+6}::numeric,$${b+7}::numeric,$${b+8}::numeric,$${b+9}::numeric)`;
    });
    const params = batch.flatMap((r) => [
      r.meter_id, r.ts, r.v1, r.v2, r.v3, r.c1, r.c2, r.c3, r.freq,
    ]);

    const upd = await client.query(`
      UPDATE meter_readings mr
      SET voltage_l1 = b.v1, voltage_l2 = b.v2, voltage_l3 = b.v3,
          current_l1 = b.c1, current_l2 = b.c2, current_l3 = b.c3,
          frequency_hz = b.freq
      FROM (VALUES ${placeholders.join(',')}) AS b(meter_id,ts,v1,v2,v3,c1,c2,c3,freq)
      WHERE mr.meter_id = b.meter_id AND mr.timestamp = b.ts
        AND mr.voltage_l1 IS NULL
    `, params);
    totalUpdated += upd.rowCount || 0;
    batch = [];
  }

  res.Body.pipe(parser);
  for await (const rec of parser) {
    rowNum++;
    const v1 = dec(rec.voltage_L1);
    // Skip rows where voltage is null in CSV (nothing to backfill)
    if (v1 == null) continue;

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

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
      if (totalUpdated % 100000 < BATCH_SIZE) {
        console.log(`  ${key}: ${rowNum} rows read, ${totalUpdated} updated`);
      }
    }
  }
  await flushBatch();
  console.log(`  ${key}: DONE — ${rowNum} rows read, ${totalUpdated} updated`);
  return { key, rowsRead: rowNum, rowsUpdated: totalUpdated };
}

export async function handler(event) {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'energy_monitor',
    user: process.env.DB_USERNAME || 'emadmin',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 600000,
  });
  await client.connect();

  const results = [];
  try {
    if (event?.key) {
      results.push(await processCSV(client, BUCKET, event.key));
    } else {
      const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'raw/' }));
      const keys = (list.Contents || []).map((o) => o.Key).filter((k) => k?.endsWith('.csv'));
      for (const k of keys) {
        results.push(await processCSV(client, BUCKET, k));
      }
    }

    // Verify
    const { rows: check } = await client.query(`
      SELECT LEFT(meter_id,2) AS pfx, COUNT(*)::bigint AS total,
             COUNT(voltage_l1)::bigint AS has_v, COUNT(frequency_hz)::bigint AS has_f
      FROM meter_readings GROUP BY LEFT(meter_id,2) ORDER BY pfx
    `);
    console.log('Verification:');
    for (const r of check) {
      console.log(`  ${r.pfx}: total=${r.total} voltage=${r.has_v} freq=${r.has_f}`);
    }

    return { statusCode: 200, body: { results, verification: check } };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: { error: err.message, results } };
  } finally {
    await client.end();
  }
}
