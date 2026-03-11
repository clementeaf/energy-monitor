/**
 * Lambda handler para verificación RDS. Invocable con AWS CLI:
 *   aws lambda invoke --function-name power-digital-api-dev-dbVerify out.json && cat out.json
 *
 * Usa las mismas env vars que la API (DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD) en la VPC.
 */

import { Client } from 'pg';
import type { Handler } from 'aws-lambda';

interface DbVerifyResult {
  counts: { readings: number; meters: number; buildings: number; staging: number | null };
  metersPerBuilding: Array<{ building_id: string; meter_count: number }>;
  meterIdSample: string[];
  meterIdLengthWarning: boolean;
  timeRanges: Array<{ meter_id: string; min_ts: string; max_ts: string }>;
  hierarchy: Array<{ building_id: string; node_count: number }> | null;
  buildings: Array<{ id: string; name: string; meters_count: number }>;
}

function getConfig() {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT || 5432);
  const database = process.env.DB_NAME || 'energy_monitor';
  const user = process.env.DB_USERNAME || process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (!host || !user || !password) {
    throw new Error('Faltan DB_HOST, DB_USERNAME o DB_PASSWORD en el entorno de la Lambda');
  }
  return {
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
  };
}

export const handler: Handler = async (): Promise<{ statusCode: number; body: string }> => {
  const client = new Client(getConfig());

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
      'SELECT DISTINCT meter_id FROM meters ORDER BY meter_id LIMIT 50',
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
