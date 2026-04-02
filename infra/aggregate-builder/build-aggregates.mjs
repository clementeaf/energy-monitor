/**
 * build-aggregates.mjs — Full population of aggregate tables
 *
 * Phases:
 *   1. hourly  — INSERT...SELECT from readings → agg_meter_hourly (day by day)
 *   2. daily   — Rollup agg_meter_hourly → analisis (meter-level + building-level, period_type=day)
 *   3. monthly — Rollup daily analisis → analisis (period_type=month)
 *   4. node    — For each hierarchy node, rollup from agg_meter_hourly → agg_node_daily
 *
 * Environment:
 *   FROM_DATE      Start date ISO (default: 2026-01-01)
 *   TO_DATE        End date ISO (default: today)
 *   PHASE          hourly | daily | monthly | node | all (default: all)
 *   DRY_RUN        true to print without executing (default: false)
 *   AWS_REGION     (default: us-east-1)
 *   DB_SECRET_NAME (default: energy-monitor/drive-ingest/db)
 *   DB_HOST        override for local SSH tunnel
 *   DB_PORT        override for local SSH tunnel
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const PHASE = process.env.PHASE || 'all';
const DRY_RUN = process.env.DRY_RUN === 'true';
const FROM_DATE = process.env.FROM_DATE || '2026-01-01';
const TO_DATE = process.env.TO_DATE || new Date().toISOString().slice(0, 10);

// ─── Connection ────────────────────────────────────────────────

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
    ssl: getPgSslOptionsForRds(),
  };
}

function log(phase, msg) {
  console.log(`[${phase}] ${msg}`);
}

function fmt(n) {
  return Number(n).toLocaleString('en-US');
}

// ─── Phase 1: Hourly ──────────────────────────────────────────

async function phaseHourly(client) {
  log('hourly', `Building agg_meter_hourly from ${FROM_DATE} to ${TO_DATE}`);

  // Process day by day to limit memory
  const startDate = new Date(FROM_DATE);
  const endDate = new Date(TO_DATE);
  let totalInserted = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().slice(0, 10);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().slice(0, 10);

    const sql = `
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
      WHERE r.timestamp >= $1::date AND r.timestamp < $2::date
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
        last_reading_at = EXCLUDED.last_reading_at`;

    if (DRY_RUN) {
      log('hourly', `[dry-run] Would process ${dayStr}`);
      continue;
    }

    const result = await client.query(sql, [dayStr, nextDayStr]);
    const count = result.rowCount || 0;
    totalInserted += count;
    if (count > 0) {
      log('hourly', `${dayStr}: ${fmt(count)} rows upserted`);
    }
  }

  log('hourly', `Done. Total rows upserted: ${fmt(totalInserted)}`);
}

// ─── Phase 2: Daily (meter + building → analisis) ─────────────

async function phaseDaily(client) {
  log('daily', 'Building analisis (period_type=day) from agg_meter_hourly');

  // Meter-level daily
  const meterSql = `
    INSERT INTO analisis (meter_id, period_type, period_start, period_end, consumption_kwh, avg_power_kw, peak_demand_kw, num_readings)
    SELECT
      a.meter_id,
      'day',
      date_trunc('day', a.bucket),
      date_trunc('day', a.bucket) + interval '1 day',
      SUM(a.max_energy_kwh - a.min_energy_kwh),
      AVG(a.avg_power_kw),
      MAX(a.max_power_kw),
      SUM(a.reading_count)::int
    FROM agg_meter_hourly a
    WHERE a.bucket >= $1::date AND a.bucket < $2::date
    GROUP BY a.meter_id, date_trunc('day', a.bucket)
    ON CONFLICT DO NOTHING`;

  if (DRY_RUN) {
    log('daily', '[dry-run] Would insert meter-level daily into analisis');
  } else {
    // Delete existing daily meter analisis in range first
    await client.query(
      `DELETE FROM analisis WHERE period_type = 'day' AND meter_id IS NOT NULL AND period_start >= $1::date AND period_start < $2::date`,
      [FROM_DATE, TO_DATE],
    );
    const result = await client.query(meterSql, [FROM_DATE, TO_DATE]);
    log('daily', `Meter-level daily: ${fmt(result.rowCount || 0)} rows inserted`);
  }

  // Building-level daily
  const buildingSql = `
    INSERT INTO analisis (building_id, period_type, period_start, period_end, consumption_kwh, avg_power_kw, peak_demand_kw, num_readings)
    SELECT
      m.building_id,
      'day',
      date_trunc('day', a.bucket),
      date_trunc('day', a.bucket) + interval '1 day',
      SUM(a.max_energy_kwh - a.min_energy_kwh),
      AVG(a.avg_power_kw),
      MAX(a.max_power_kw),
      SUM(a.reading_count)::int
    FROM agg_meter_hourly a
    INNER JOIN meters m ON m.id = a.meter_id
    WHERE a.bucket >= $1::date AND a.bucket < $2::date
    GROUP BY m.building_id, date_trunc('day', a.bucket)
    ON CONFLICT DO NOTHING`;

  if (DRY_RUN) {
    log('daily', '[dry-run] Would insert building-level daily into analisis');
  } else {
    await client.query(
      `DELETE FROM analisis WHERE period_type = 'day' AND building_id IS NOT NULL AND period_start >= $1::date AND period_start < $2::date`,
      [FROM_DATE, TO_DATE],
    );
    const result = await client.query(buildingSql, [FROM_DATE, TO_DATE]);
    log('daily', `Building-level daily: ${fmt(result.rowCount || 0)} rows inserted`);
  }
}

// ─── Phase 3: Monthly ─────────────────────────────────────────

async function phaseMonthly(client) {
  log('monthly', 'Building analisis (period_type=month) from daily analisis');

  // Meter-level monthly
  const meterSql = `
    INSERT INTO analisis (meter_id, period_type, period_start, period_end, consumption_kwh, avg_power_kw, peak_demand_kw, num_readings)
    SELECT
      meter_id,
      'month',
      date_trunc('month', period_start),
      date_trunc('month', period_start) + interval '1 month',
      SUM(consumption_kwh),
      AVG(avg_power_kw),
      MAX(peak_demand_kw),
      SUM(num_readings)::int
    FROM analisis
    WHERE period_type = 'day' AND meter_id IS NOT NULL
      AND period_start >= $1::date AND period_start < $2::date
    GROUP BY meter_id, date_trunc('month', period_start)
    ON CONFLICT DO NOTHING`;

  if (DRY_RUN) {
    log('monthly', '[dry-run] Would insert meter-level monthly');
  } else {
    await client.query(
      `DELETE FROM analisis WHERE period_type = 'month' AND meter_id IS NOT NULL AND period_start >= $1::date AND period_start < $2::date`,
      [FROM_DATE, TO_DATE],
    );
    const result = await client.query(meterSql, [FROM_DATE, TO_DATE]);
    log('monthly', `Meter-level monthly: ${fmt(result.rowCount || 0)} rows`);
  }

  // Building-level monthly
  const buildingSql = `
    INSERT INTO analisis (building_id, period_type, period_start, period_end, consumption_kwh, avg_power_kw, peak_demand_kw, num_readings)
    SELECT
      building_id,
      'month',
      date_trunc('month', period_start),
      date_trunc('month', period_start) + interval '1 month',
      SUM(consumption_kwh),
      AVG(avg_power_kw),
      MAX(peak_demand_kw),
      SUM(num_readings)::int
    FROM analisis
    WHERE period_type = 'day' AND building_id IS NOT NULL
      AND period_start >= $1::date AND period_start < $2::date
    GROUP BY building_id, date_trunc('month', period_start)
    ON CONFLICT DO NOTHING`;

  if (DRY_RUN) {
    log('monthly', '[dry-run] Would insert building-level monthly');
  } else {
    await client.query(
      `DELETE FROM analisis WHERE period_type = 'month' AND building_id IS NOT NULL AND period_start >= $1::date AND period_start < $2::date`,
      [FROM_DATE, TO_DATE],
    );
    const result = await client.query(buildingSql, [FROM_DATE, TO_DATE]);
    log('monthly', `Building-level monthly: ${fmt(result.rowCount || 0)} rows`);
  }
}

// ─── Phase 4: Node daily ──────────────────────────────────────

async function phaseNode(client) {
  log('node', 'Building agg_node_daily from agg_meter_hourly + hierarchy_nodes');

  // Get all hierarchy nodes
  const nodesRes = await client.query(`SELECT id FROM hierarchy_nodes ORDER BY level DESC, id`);
  const nodes = nodesRes.rows;
  log('node', `Found ${nodes.length} hierarchy nodes`);

  let totalInserted = 0;

  for (const node of nodes) {
    // For each node, aggregate from agg_meter_hourly using its subtree meters
    const sql = `
      INSERT INTO agg_node_daily (node_id, bucket, total_kwh, avg_power_kw, peak_power_kw, meter_count, reading_count)
      SELECT
        $1,
        date_trunc('day', a.bucket)::date,
        SUM(a.max_energy_kwh - a.min_energy_kwh),
        AVG(a.avg_power_kw),
        MAX(a.max_power_kw),
        COUNT(DISTINCT a.meter_id)::smallint,
        SUM(a.reading_count)::int
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
      GROUP BY date_trunc('day', a.bucket)::date
      ON CONFLICT (node_id, bucket) DO UPDATE SET
        total_kwh = EXCLUDED.total_kwh,
        avg_power_kw = EXCLUDED.avg_power_kw,
        peak_power_kw = EXCLUDED.peak_power_kw,
        meter_count = EXCLUDED.meter_count,
        reading_count = EXCLUDED.reading_count`;

    if (DRY_RUN) {
      continue;
    }

    const result = await client.query(sql, [node.id, FROM_DATE, TO_DATE]);
    const count = result.rowCount || 0;
    totalInserted += count;
    if (count > 0) {
      log('node', `${node.id}: ${count} days`);
    }
  }

  log('node', `Done. Total rows upserted: ${fmt(totalInserted)}`);
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== build-aggregates.mjs ===`);
  console.log(`Phase: ${PHASE} | Range: ${FROM_DATE} → ${TO_DATE} | DRY_RUN: ${DRY_RUN}\n`);

  let dbConfig;
  if (process.env.DB_HOST && process.env.DB_PORT) {
    // Local mode with env vars (tunnel)
    const dotenvPath = new URL('../../backend/.env', import.meta.url).pathname;
    try {
      const { readFileSync } = await import('fs');
      const envContent = readFileSync(dotenvPath, 'utf-8');
      const envVars = {};
      for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) envVars[match[1].trim()] = match[2].trim();
      }
      dbConfig = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: envVars.DB_NAME || process.env.DB_NAME,
        user: envVars.DB_USERNAME || process.env.DB_USERNAME,
        password: envVars.DB_PASSWORD || process.env.DB_PASSWORD,
        ssl: false,
      };
    } catch {
      dbConfig = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        ssl: false,
      };
    }
  } else {
    const secret = await getSecretJson(DB_SECRET_NAME);
    dbConfig = buildDbConfig(secret);
  }

  const client = new Client(dbConfig);
  await client.connect();
  log('main', `Connected to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  try {
    if (PHASE === 'all' || PHASE === 'hourly') await phaseHourly(client);
    if (PHASE === 'all' || PHASE === 'daily') await phaseDaily(client);
    if (PHASE === 'all' || PHASE === 'monthly') await phaseMonthly(client);
    if (PHASE === 'all' || PHASE === 'node') await phaseNode(client);

    // Final counts
    const [hourlyCount] = (await client.query(`SELECT COUNT(*) AS cnt FROM agg_meter_hourly`)).rows;
    const [nodeCount] = (await client.query(`SELECT COUNT(*) AS cnt FROM agg_node_daily`)).rows;
    const [analisisCount] = (await client.query(`SELECT COUNT(*) AS cnt FROM analisis`)).rows;

    console.log(`\n=== Final counts ===`);
    console.log(`agg_meter_hourly: ${fmt(hourlyCount.cnt)}`);
    console.log(`agg_node_daily:   ${fmt(nodeCount.cnt)}`);
    console.log(`analisis:         ${fmt(analisisCount.cnt)}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
