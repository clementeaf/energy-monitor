import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Client } from 'pg';
import { getPgSslOptionsForRds } from './rds-ssl';
import { parsePayload } from './parsers';
import { resolveDevice } from './device-map';
import { toEavRows } from './eav';
import type { EavRow } from './types';

// ── Config ──────────────────────────────────────────────

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

// ── S3 helpers ──────────────────────────────────────────

const getS3Json = async (key: string): Promise<unknown> => {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await res.Body!.transformToString();
  return JSON.parse(body);
};

const listKeys = async (date: string): Promise<string[]> => {
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `${PREFIX}/${date}/`,
      ContinuationToken: token,
    }));
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);

  return keys;
};

// ── DB helpers ──────────────────────────────────────────

const INSERT_EAV = `
  INSERT INTO iot_readings (time, tenant_id, meter_id, variable_name, value, quality)
  VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6)
  ON CONFLICT DO NOTHING
`;

const insertRows = async (db: Client, rows: readonly EavRow[]): Promise<number> => {
  let inserted = 0;
  for (const row of rows) {
    const result = await db.query(INSERT_EAV, [
      row.time,
      row.tenantId,
      row.meterId,
      row.variableName,
      row.value,
      row.quality,
    ]);
    inserted += result.rowCount ?? 0;
  }
  return inserted;
};

const getLastTimestamp = async (db: Client): Promise<string | null> => {
  const result = await db.query(
    'SELECT MAX(time) AS last_ts FROM iot_readings',
  );
  return result.rows[0]?.last_ts ?? null;
};

// ── Main handler ────────────────────────────────────────

export const handler = async () => {
  const log: string[] = [];
  const db = new Client(dbConfig);

  try {
    await db.connect();
    log.push('Connected to DB');

    const lastTs = await getLastTimestamp(db);
    log.push(`Last processed: ${lastTs ?? 'none'}`);

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const allKeys = [
      ...(await listKeys(yesterday)),
      ...(await listKeys(today)),
    ];
    log.push(`S3 files found: ${allKeys.length}`);

    let totalInserted = 0;
    let skipped = 0;
    let unrecognized = 0;

    for (const key of allKeys) {
      try {
        const raw = await getS3Json(key);
        const parsed = parsePayload(raw);

        if (!parsed) {
          unrecognized++;
          log.push(`Unrecognized payload: ${key}`);
          continue;
        }

        // Skip already-processed timestamps
        if (lastTs && new Date(parsed.timestamp) <= new Date(lastTs)) {
          skipped++;
          continue;
        }

        const identity = resolveDevice(parsed.deviceId);
        if (!identity) {
          log.push(`Unknown device: ${parsed.deviceId} in ${key}`);
          continue;
        }

        const rows = toEavRows(parsed, identity);
        totalInserted += await insertRows(db, rows);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown';
        log.push(`Error processing ${key}: ${msg}`);
      }
    }

    log.push(`Inserted: ${totalInserted}, Skipped: ${skipped}, Unrecognized: ${unrecognized}`);
    return { statusCode: 200, body: log };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    log.push(`Fatal: ${msg}`);
    return { statusCode: 500, body: log };
  } finally {
    await db.end().catch(() => {});
  }
};
