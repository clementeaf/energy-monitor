/**
 * incremental-hourly.mjs — Incremental aggregate update (EventBridge hourly)
 *
 * Updates agg_meter_hourly for the last 2 hours (overlap for safety),
 * then rolls up affected days into agg_node_daily and analisis.
 *
 * Environment:
 *   LOOKBACK_HOURS  Hours to re-aggregate (default: 2)
 *   AWS_REGION      (default: us-east-1)
 *   DB_SECRET_NAME  (default: energy-monitor/drive-ingest/db)
 *   DB_HOST / DB_PORT  override for local tunnel
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const LOOKBACK_HOURS = parseInt(process.env.LOOKBACK_HOURS || '2', 10);

async function getSecretJson(secretId) {
  const secretsClient = new SecretsManagerClient({ region: REGION });
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) throw new Error(`Secret ${secretId} empty`);
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

function log(msg) {
  console.log(`[incremental] ${msg}`);
}

async function main() {
  const now = new Date();
  const from = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const fromStr = from.toISOString();
  const toStr = now.toISOString();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  log(`Updating aggregates for ${fromStr} → ${toStr}`);

  let dbConfig;
  if (process.env.DB_HOST) {
    dbConfig = {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      ssl: false,
    };
  } else {
    const secret = await getSecretJson(DB_SECRET_NAME);
    dbConfig = buildDbConfig(secret);
  }

  const client = new Client(dbConfig);
  await client.connect();

  try {
    // 1. Upsert agg_meter_hourly for the lookback window
    const hourlyResult = await client.query(`
      INSERT INTO agg_meter_hourly (
        meter_id, bucket,
        avg_voltage_l1, avg_voltage_l2, avg_voltage_l3,
        avg_current_l1, avg_current_l2, avg_current_l3,
        avg_power_kw, max_power_kw,
        avg_reactive_kvar, avg_power_factor, avg_frequency_hz,
        min_energy_kwh, max_energy_kwh,
        avg_thd_voltage, avg_thd_current, avg_phase_imbalance,
        alarm_count, reading_count,
        first_reading_at, last_reading_at
      )
      SELECT
        r.meter_id,
        date_trunc('hour', r.timestamp) AS bucket,
        AVG(r.voltage_l1), AVG(r.voltage_l2), AVG(r.voltage_l3),
        AVG(r.current_l1), AVG(r.current_l2), AVG(r.current_l3),
        AVG(r.power_kw), MAX(r.power_kw),
        AVG(r.reactive_power_kvar), AVG(r.power_factor), AVG(r.frequency_hz),
        MIN(r.energy_kwh_total), MAX(r.energy_kwh_total),
        AVG(r.thd_voltage_pct), AVG(r.thd_current_pct), AVG(r.phase_imbalance_pct),
        COUNT(*) FILTER (WHERE r.alarm IS NOT NULL AND r.alarm != '')::smallint,
        COUNT(*)::smallint,
        MIN(r.timestamp), MAX(r.timestamp)
      FROM readings r
      WHERE r.timestamp >= $1 AND r.timestamp <= $2
      GROUP BY r.meter_id, date_trunc('hour', r.timestamp)
      ON CONFLICT (meter_id, bucket) DO UPDATE SET
        avg_voltage_l1 = EXCLUDED.avg_voltage_l1,
        avg_voltage_l2 = EXCLUDED.avg_voltage_l2,
        avg_voltage_l3 = EXCLUDED.avg_voltage_l3,
        avg_current_l1 = EXCLUDED.avg_current_l1,
        avg_current_l2 = EXCLUDED.avg_current_l2,
        avg_current_l3 = EXCLUDED.avg_current_l3,
        avg_power_kw = EXCLUDED.avg_power_kw,
        max_power_kw = EXCLUDED.max_power_kw,
        avg_reactive_kvar = EXCLUDED.avg_reactive_kvar,
        avg_power_factor = EXCLUDED.avg_power_factor,
        avg_frequency_hz = EXCLUDED.avg_frequency_hz,
        min_energy_kwh = EXCLUDED.min_energy_kwh,
        max_energy_kwh = EXCLUDED.max_energy_kwh,
        avg_thd_voltage = EXCLUDED.avg_thd_voltage,
        avg_thd_current = EXCLUDED.avg_thd_current,
        avg_phase_imbalance = EXCLUDED.avg_phase_imbalance,
        alarm_count = EXCLUDED.alarm_count,
        reading_count = EXCLUDED.reading_count,
        first_reading_at = EXCLUDED.first_reading_at,
        last_reading_at = EXCLUDED.last_reading_at
    `, [fromStr, toStr]);
    log(`agg_meter_hourly: ${hourlyResult.rowCount || 0} rows upserted`);

    // 2. Refresh agg_node_daily for today and yesterday
    const affectedDays = [yesterdayStr, todayStr];
    for (const day of affectedDays) {
      const nextDay = new Date(new Date(day).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Get all nodes
      const nodesRes = await client.query(`SELECT id FROM hierarchy_nodes`);
      for (const node of nodesRes.rows) {
        await client.query(`
          INSERT INTO agg_node_daily (node_id, bucket, total_kwh, avg_power_kw, peak_power_kw, meter_count, reading_count)
          SELECT
            $1,
            $2::date,
            COALESCE(SUM(a.max_energy_kwh - a.min_energy_kwh), 0),
            COALESCE(AVG(a.avg_power_kw), 0),
            COALESCE(MAX(a.max_power_kw), 0),
            COUNT(DISTINCT a.meter_id)::smallint,
            COALESCE(SUM(a.reading_count), 0)::int
          FROM agg_meter_hourly a
          WHERE a.meter_id IN (
            WITH RECURSIVE subtree AS (
              SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
              UNION ALL
              SELECT h.id, h.meter_id FROM hierarchy_nodes h
              INNER JOIN subtree s ON h.parent_id = s.id
            )
            SELECT TRIM(LOWER(meter_id)) FROM subtree WHERE meter_id IS NOT NULL
          )
          AND a.bucket >= $2::date AND a.bucket < $3::date
          ON CONFLICT (node_id, bucket) DO UPDATE SET
            total_kwh = EXCLUDED.total_kwh,
            avg_power_kw = EXCLUDED.avg_power_kw,
            peak_power_kw = EXCLUDED.peak_power_kw,
            meter_count = EXCLUDED.meter_count,
            reading_count = EXCLUDED.reading_count
        `, [node.id, day, nextDay]);
      }
      log(`agg_node_daily refreshed for ${day}`);
    }

    log('Done');
  } finally {
    await client.end();
  }
}

// Lambda handler
export async function handler() {
  await main();
  return { statusCode: 200, body: 'OK' };
}

// Direct execution
main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
