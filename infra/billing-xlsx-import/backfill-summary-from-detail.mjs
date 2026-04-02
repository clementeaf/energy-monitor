#!/usr/bin/env node
/**
 * Rellena billing_center_summary a partir de billing_monthly_detail (agregados por centro/año/mes).
 * Útil cuando la hoja Resumen Ejecutivo no cargó bien y el detalle sí tiene datos.
 *
 * Uso: node backfill-summary-from-detail.mjs
 *      DB: env (DB_HOST, DB_NAME, DB_USERNAME, DB_PASSWORD) o Secrets Manager.
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import pg from 'pg';

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';

function configFromEnv() {
  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME || process.env.DATABASE_NAME;
  const user = process.env.DB_USERNAME || process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (host && database && user && password) {
    return {
      host,
      port: Number(process.env.DB_PORT || 5432),
      database,
      user,
      password,
      ssl: process.env.DB_SSL !== 'false' ? getPgSslOptionsForRds() : false,
    };
  }
  return null;
}

async function getDbConfig() {
  const config = configFromEnv();
  if (config) return config;
  const sm = new SecretsManagerClient({ region: REGION });
  const res = await sm.send(new GetSecretValueCommand({ SecretId: DB_SECRET_NAME }));
  if (!res.SecretString) throw new Error(`Secret ${DB_SECRET_NAME} has no SecretString`);
  const secret = JSON.parse(res.SecretString);
  return {
    host: process.env.DB_HOST || secret.host || secret.DB_HOST,
    port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
    database: secret.dbname || secret.database || secret.DB_NAME,
    user: secret.username || secret.user || secret.DB_USERNAME,
    password: secret.password || secret.DB_PASSWORD,
    ssl: getPgSslOptionsForRds(),
  };
}

async function main() {
  const config = await getDbConfig();
  const client = new pg.Client(config);
  await client.connect();
  try {
    const sql = `
      WITH agg AS (
        SELECT
          center_name,
          year,
          month,
          SUM(consumption_kwh) AS total_consumption_kwh,
          MAX(peak_kw) AS peak_max_kw,
          SUM(demand_punta_kwh) AS demand_punta_kwh,
          CASE WHEN SUM(consumption_kwh) > 0 THEN SUM(COALESCE(demand_punta_kwh, 0)) / SUM(consumption_kwh) ELSE NULL END AS pct_punta,
          CASE WHEN SUM(consumption_kwh) > 0 THEN SUM(consumption_kwh) / 30.0 ELSE NULL END AS avg_daily_kwh
        FROM billing_monthly_detail
        GROUP BY center_name, year, month
      ),
      top_local AS (
        SELECT DISTINCT ON (center_name, year, month)
          center_name, year, month,
          COALESCE(store_name, meter_id) AS top_consumer_local
        FROM billing_monthly_detail
        WHERE consumption_kwh IS NOT NULL
        ORDER BY center_name, year, month, consumption_kwh DESC NULLS LAST
      )
      INSERT INTO billing_center_summary (
        center_name, year, month, total_consumption_kwh, peak_max_kw, demand_punta_kwh,
        pct_punta, avg_daily_kwh, top_consumer_local, source_file
      )
      SELECT
        a.center_name, a.year, a.month,
        a.total_consumption_kwh, a.peak_max_kw, a.demand_punta_kwh,
        a.pct_punta, a.avg_daily_kwh, t.top_consumer_local, 'backfill-from-detail'
      FROM agg a
      LEFT JOIN top_local t ON a.center_name = t.center_name AND a.year = t.year AND a.month = t.month
      ON CONFLICT (center_name, year, month) DO UPDATE SET
        total_consumption_kwh = EXCLUDED.total_consumption_kwh,
        peak_max_kw = EXCLUDED.peak_max_kw,
        demand_punta_kwh = EXCLUDED.demand_punta_kwh,
        pct_punta = EXCLUDED.pct_punta,
        avg_daily_kwh = EXCLUDED.avg_daily_kwh,
        top_consumer_local = COALESCE(EXCLUDED.top_consumer_local, billing_center_summary.top_consumer_local),
        source_file = EXCLUDED.source_file
    `;
    const res = await client.query(sql);
    const count = res.rowCount ?? 0;
    console.log(`Backfill OK: ${count} rows upserted in billing_center_summary`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
