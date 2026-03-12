/**
 * Lambda handler para verificación RDS. Invocable con AWS CLI:
 *   aws lambda invoke --function-name power-digital-api-dev-dbVerify out.json && cat out.json
 *
 * Credenciales: env vars (DB_HOST, DB_USERNAME, DB_PASSWORD) o, si faltan, Secrets Manager
 * (DB_SECRET_NAME, default energy-monitor/drive-ingest/db). Misma VPC que la API.
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';
import type { Handler } from 'aws-lambda';

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';

interface DbVerifyResult {
  counts: { readings: number; meters: number; buildings: number; staging: number | null };
  metersPerBuilding: Array<{ building_id: string; meter_count: number }>;
  meterIdSample: string[];
  meterIdLengthWarning: boolean;
  timeRanges: Array<{ meter_id: string; min_ts: string; max_ts: string }>;
  hierarchy: Array<{ building_id: string; node_count: number }> | null;
  buildings: Array<{ id: string; name: string; meters_count: number }>;
}

interface PgConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: { rejectUnauthorized: false };
}

function hasEnvCredentials(): boolean {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USERNAME || process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  return Boolean(host && user && password);
}

function pickSecret<T>(secret: Record<string, T>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = secret[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v as T;
  }
  return undefined;
}

/** Extrae valor de secret con claves alternativas (misma lógica que drive-pipeline buildDbConfig). */
function fromSecret(secret: Record<string, string | number | undefined>, envVal: string | undefined, ...keys: string[]): string {
  const raw = envVal ?? keys.map((k) => secret[k]).find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  return raw != null ? String(raw).trim() : '';
}

async function getConfigFromSecret(): Promise<PgConfig> {
  const sm = new SecretsManagerClient({ region: REGION });
  const res = await sm.send(new GetSecretValueCommand({ SecretId: DB_SECRET_NAME }));
  if (!res.SecretString) throw new Error(`Secret ${DB_SECRET_NAME} has no SecretString`);
  const secret = JSON.parse(res.SecretString) as Record<string, string | number | undefined>;
  const host = fromSecret(secret, process.env.DB_HOST, 'host', 'DB_HOST', 'Host');
  const port = Number(process.env.DB_PORT ?? pickSecret(secret, 'port', 'DB_PORT', 'Port') ?? 5432);
  const database = fromSecret(secret, process.env.DB_NAME, 'dbname', 'database', 'DB_NAME', 'dbName') || 'energy_monitor';
  const user = fromSecret(secret, process.env.DB_USERNAME ?? process.env.DB_USER, 'username', 'user', 'DB_USERNAME', 'Username', 'User');
  const password = fromSecret(secret, process.env.DB_PASSWORD, 'password', 'DB_PASSWORD', 'Password', 'pass', 'passwd', 'pwd');
  if (!host || !user || !password) {
    const missing = [(!host && 'host'), (!user && 'user'), (!password && 'password')].filter(Boolean).join(', ');
    throw new Error(`Secret incompleto: faltan ${missing}. Claves en secret: ${Object.keys(secret).join(', ')}`);
  }
  return { host, port, database, user, password, ssl: { rejectUnauthorized: false } };
}

async function getConfig(): Promise<PgConfig> {
  if (hasEnvCredentials()) {
    return {
      host: process.env.DB_HOST!,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'energy_monitor',
      user: process.env.DB_USERNAME || process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
      ssl: { rejectUnauthorized: false },
    };
  }
  return getConfigFromSecret();
}

export const handler: Handler = async (): Promise<{ statusCode: number; body: string }> => {
  let config: PgConfig;
  try {
    config = await getConfig();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Config RDS no disponible', detail: message }),
    };
  }
  const client = new Client(config);

  try {
    await client.connect();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No se pudo conectar a RDS', detail: message }),
    };
  }

  try {
    const [readingsRes, metersRes, buildingsRes] = await Promise.all([
      client.query<{ total: string }>('SELECT COUNT(*)::bigint AS total FROM readings'),
      client.query<{ total: string }>('SELECT COUNT(*)::bigint AS total FROM meters'),
      client.query<{ total: string }>('SELECT COUNT(*)::bigint AS total FROM buildings'),
    ]);

    let staging: number | null = null;
    try {
      const stagingRes = await client.query<{ total: string }>(
        'SELECT COUNT(*)::bigint AS total FROM readings_import_staging',
      );
      staging = Number(stagingRes.rows[0]?.total ?? 0);
    } catch {
      // tabla puede no existir
    }

    const counts = {
      readings: Number(readingsRes.rows[0]?.total ?? 0),
      meters: Number(metersRes.rows[0]?.total ?? 0),
      buildings: Number(buildingsRes.rows[0]?.total ?? 0),
      staging,
    };

    const metersPerBuilding = (
      await client.query<{ building_id: string; meter_count: string }>(
        `SELECT building_id, COUNT(*)::int AS meter_count
         FROM meters GROUP BY building_id ORDER BY meter_count DESC LIMIT 20`,
      )
    ).rows.map((r: { building_id: string; meter_count: string }) => ({ building_id: r.building_id, meter_count: Number(r.meter_count) }));

    const meterIdRows = await client.query<{ meter_id: string }>(
      'SELECT id AS meter_id FROM meters ORDER BY id LIMIT 50',
    );
    const meterIdSample = meterIdRows.rows.map((r: { meter_id: string }) => r.meter_id);
    const meterIdLengthWarning = meterIdSample.some((id: string) => id.length > 10);

    const timeRanges = (
      await client.query<{ meter_id: string; min_ts: string; max_ts: string }>(
        `SELECT meter_id, MIN(timestamp)::text AS min_ts, MAX(timestamp)::text AS max_ts
         FROM readings GROUP BY meter_id ORDER BY meter_id LIMIT 20`,
      )
    ).rows;

    let hierarchy: DbVerifyResult['hierarchy'] = null;
    try {
      const hierarchyRows = await client.query<{ building_id: string; node_count: string }>(
        `SELECT building_id, COUNT(*)::int AS node_count
         FROM hierarchy_nodes GROUP BY building_id ORDER BY building_id`,
      );
      hierarchy = hierarchyRows.rows.map((r: { building_id: string; node_count: string }) => ({
        building_id: r.building_id,
        node_count: Number(r.node_count),
      }));
    } catch {
      // tabla puede no existir
    }

    const buildings = (
      await client.query<{ id: string; name: string; meters_count: string }>(
        `SELECT b.id, b.name, (SELECT COUNT(*) FROM meters m WHERE m.building_id = b.id) AS meters_count
         FROM buildings b ORDER BY b.id`,
      )
    ).rows.map((r: { id: string; name: string; meters_count: string }) => ({ id: r.id, name: r.name, meters_count: Number(r.meters_count) }));

    const result: DbVerifyResult = {
      counts,
      metersPerBuilding,
      meterIdSample,
      meterIdLengthWarning,
      timeRanges,
      hierarchy,
      buildings,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result, null, 2),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error ejecutando consultas', detail: message }),
    };
  } finally {
    await client.end();
  }
};
