#!/usr/bin/env node
/**
 * Cruce billing vs consumo: compara kWh facturados (billing_monthly_detail)
 * contra kWh medidos (readings/agg_meter_hourly/analisis) por meter_id y mes.
 *
 * Uso local (con túnel): DB_HOST=127.0.0.1 DB_PORT=5433 node billing-vs-consumption.mjs
 * Uso con Secrets Manager: DB_USE_SECRET=1 node billing-vs-consumption.mjs
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from multiple locations
for (const p of [
  resolve(__dirname, '.env'),
  resolve(__dirname, '../../backend/.env'),
  resolve(__dirname, '../..', '.env'),
]) {
  if (existsSync(p)) { dotenvConfig({ path: p }); break; }
}

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';

async function getDbConfig() {
  if (process.env.DB_USE_SECRET === '1' || (!process.env.DB_HOST && !process.env.DB_PASSWORD)) {
    const sm = new SecretsManagerClient({ region: REGION });
    const res = await sm.send(new GetSecretValueCommand({ SecretId: DB_SECRET_NAME }));
    const secret = JSON.parse(res.SecretString);
    return {
      host: process.env.DB_HOST || secret.host || secret.DB_HOST,
      port: Number(process.env.DB_PORT || secret.port || 5432),
      database: secret.dbname || secret.database || 'energy_monitor',
      user: secret.username || secret.user || secret.DB_USERNAME,
      password: secret.password || secret.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    };
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'energy_monitor',
    user: process.env.DB_USERNAME || process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  };
}

function fmt(n) { return n == null ? '-' : Number(n).toLocaleString('es-CL', { maximumFractionDigits: 1 }); }
function pct(a, b) { return b ? ((a - b) / b * 100).toFixed(1) + '%' : '-'; }

async function run() {
  const config = await getDbConfig();
  const client = new pg.Client(config);
  await client.connect();
  console.log('Conectado a RDS\n');

  // 1. Check billing tables exist
  const tableCheck = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('billing_monthly_detail','billing_center_summary','billing_tariffs',
                         'readings','agg_meter_hourly','analisis','meters','buildings')
    ORDER BY table_name
  `);
  console.log('=== TABLAS ENCONTRADAS ===');
  tableCheck.rows.forEach(r => console.log(' ', r.table_name));
  console.log();

  // 2. Billing overview
  const billingCount = await client.query(`SELECT COUNT(*)::int AS total FROM billing_monthly_detail`);
  const billingSummaryCount = await client.query(`SELECT COUNT(*)::int AS total FROM billing_center_summary`);
  console.log('=== BILLING: RESUMEN ===');
  console.log(`  billing_monthly_detail: ${billingCount.rows[0].total} filas`);
  console.log(`  billing_center_summary: ${billingSummaryCount.rows[0].total} filas`);

  // 3. Distinct centers and meter_ids in billing
  const billingCenters = await client.query(`
    SELECT DISTINCT center_name FROM billing_monthly_detail ORDER BY center_name
  `);
  console.log(`\n  Centros en billing: ${billingCenters.rows.length}`);
  billingCenters.rows.forEach(r => console.log(`    - "${r.center_name}"`));

  const billingMeterIds = await client.query(`
    SELECT DISTINCT meter_id FROM billing_monthly_detail WHERE meter_id IS NOT NULL ORDER BY meter_id
  `);
  console.log(`\n  meter_ids distintos en billing: ${billingMeterIds.rows.length}`);
  if (billingMeterIds.rows.length <= 30) {
    billingMeterIds.rows.forEach(r => console.log(`    - "${r.meter_id}"`));
  } else {
    billingMeterIds.rows.slice(0, 15).forEach(r => console.log(`    - "${r.meter_id}"`));
    console.log(`    ... (${billingMeterIds.rows.length - 15} más)`);
  }

  // 4. Distinct meter_ids in meters table
  const meterIds = await client.query(`SELECT id FROM meters ORDER BY id LIMIT 30`);
  console.log(`\n=== METERS TABLE: muestra de IDs ===`);
  console.log(`  Total meters: ${(await client.query('SELECT COUNT(*)::int AS c FROM meters')).rows[0].c}`);
  meterIds.rows.slice(0, 15).forEach(r => console.log(`    - "${r.id}"`));
  if (meterIds.rows.length > 15) console.log(`    ... (más)`);

  // 5. Buildings vs billing centers
  const buildings = await client.query(`SELECT id, name FROM buildings ORDER BY id`);
  console.log(`\n=== BUILDINGS vs BILLING CENTERS ===`);
  buildings.rows.forEach(b => {
    const match = billingCenters.rows.find(c =>
      c.center_name.toLowerCase().includes(b.name.toLowerCase().substring(0, 10)) ||
      b.name.toLowerCase().includes(c.center_name.toLowerCase().substring(0, 10))
    );
    console.log(`  building: "${b.id}" / "${b.name}" → billing center: ${match ? `"${match.center_name}"` : 'SIN MATCH'}`);
  });

  // 6. meter_id overlap
  const overlap = await client.query(`
    SELECT
      (SELECT COUNT(DISTINCT meter_id) FROM billing_monthly_detail WHERE meter_id IS NOT NULL) AS billing_meters,
      (SELECT COUNT(*) FROM meters) AS catalog_meters,
      (SELECT COUNT(*) FROM meters m WHERE EXISTS (
        SELECT 1 FROM billing_monthly_detail b WHERE TRIM(LOWER(b.meter_id)) = TRIM(LOWER(m.id))
      )) AS matched_meters
  `);
  const ov = overlap.rows[0];
  console.log(`\n=== METER_ID OVERLAP ===`);
  console.log(`  meter_ids en billing: ${ov.billing_meters}`);
  console.log(`  meter_ids en meters:  ${ov.catalog_meters}`);
  console.log(`  match (TRIM LOWER):   ${ov.matched_meters}`);

  // 7. Billing months/years range
  const billingRange = await client.query(`
    SELECT MIN(year) AS min_y, MAX(year) AS max_y,
           MIN(year * 100 + month) AS min_ym, MAX(year * 100 + month) AS max_ym,
           COUNT(DISTINCT year * 100 + month) AS months_count
    FROM billing_monthly_detail
  `);
  const br = billingRange.rows[0];
  console.log(`\n=== RANGO TEMPORAL ===`);
  console.log(`  Billing: ${br.min_ym} a ${br.max_ym} (${br.months_count} meses)`);

  const readingsRange = await client.query(`
    SELECT MIN(timestamp)::date AS min_date, MAX(timestamp)::date AS max_date FROM readings
  `);
  const rr = readingsRange.rows[0];
  console.log(`  Readings: ${rr.min_date} a ${rr.max_date}`);

  // 8. Analisis availability
  let analisisInfo = null;
  try {
    analisisInfo = await client.query(`
      SELECT period_type, COUNT(*)::int AS cnt,
             MIN(period_start)::date AS min_date, MAX(period_end)::date AS max_date
      FROM analisis GROUP BY period_type ORDER BY period_type
    `);
    console.log(`\n=== ANALISIS (agregados pre-calculados) ===`);
    analisisInfo.rows.forEach(r => console.log(`  ${r.period_type}: ${r.cnt} filas (${r.min_date} a ${r.max_date})`));
  } catch { console.log('\n  analisis: tabla no disponible'); }

  // 9. agg_meter_hourly availability
  try {
    const aggHourly = await client.query(`
      SELECT COUNT(*)::int AS cnt, MIN(bucket)::date AS min_date, MAX(bucket)::date AS max_date
      FROM agg_meter_hourly
    `);
    const ah = aggHourly.rows[0];
    console.log(`\n=== AGG_METER_HOURLY ===`);
    console.log(`  ${ah.cnt} filas (${ah.min_date} a ${ah.max_date})`);
  } catch { console.log('\n  agg_meter_hourly: tabla no disponible'); }

  // 10. CRUCE: billing consumption vs measured consumption by meter/month
  // Use analisis (monthly) if available, otherwise aggregate from readings
  console.log(`\n=== CRUCE kWh FACTURADO vs kWh MEDIDO ===`);

  const crossQuery = await client.query(`
    WITH billing AS (
      SELECT center_name, year, month, meter_id,
             consumption_kwh::numeric AS billed_kwh
      FROM billing_monthly_detail
      WHERE meter_id IS NOT NULL AND consumption_kwh IS NOT NULL
    ),
    measured AS (
      SELECT meter_id,
             EXTRACT(YEAR FROM bucket)::int AS year,
             EXTRACT(MONTH FROM bucket)::int AS month,
             (MAX(max_energy_kwh) - MIN(min_energy_kwh))::numeric AS measured_kwh
      FROM agg_meter_hourly
      GROUP BY meter_id, EXTRACT(YEAR FROM bucket), EXTRACT(MONTH FROM bucket)
    )
    SELECT
      b.center_name,
      b.year, b.month, b.meter_id,
      ROUND(b.billed_kwh, 1) AS billed_kwh,
      ROUND(COALESCE(m.measured_kwh, 0), 1) AS measured_kwh,
      CASE WHEN m.measured_kwh IS NULL THEN 'NO_DATA'
           WHEN b.billed_kwh = 0 THEN 'ZERO_BILLED'
           ELSE ROUND(((m.measured_kwh - b.billed_kwh) / NULLIF(b.billed_kwh, 0) * 100)::numeric, 1)::text || '%'
      END AS diff_pct
    FROM billing b
    LEFT JOIN measured m ON TRIM(LOWER(b.meter_id)) = TRIM(LOWER(m.meter_id))
                         AND b.year = m.year AND b.month = m.month
    ORDER BY b.center_name, b.year, b.month, b.meter_id
    LIMIT 50
  `);

  if (crossQuery.rows.length === 0) {
    console.log('  Sin resultados de cruce (billing o agg_meter_hourly vacíos, o meter_ids no coinciden)');
  } else {
    console.log(`  Mostrando primeros ${crossQuery.rows.length} registros:\n`);
    console.log('  Centro | Año | Mes | Meter | kWh Facturado | kWh Medido | Diff%');
    console.log('  ' + '-'.repeat(90));
    crossQuery.rows.forEach(r => {
      console.log(`  ${(r.center_name || '').substring(0, 25).padEnd(25)} | ${r.year} | ${String(r.month).padStart(2)} | ${(r.meter_id || '').padEnd(8)} | ${String(r.billed_kwh).padStart(13)} | ${String(r.measured_kwh).padStart(10)} | ${r.diff_pct}`);
    });
  }

  // 11. Aggregated summary: total billed vs total measured per center/month
  console.log(`\n=== RESUMEN POR CENTRO/MES: kWh FACTURADO vs MEDIDO ===`);
  const summaryQuery = await client.query(`
    WITH billing_agg AS (
      SELECT center_name, year, month,
             SUM(consumption_kwh::numeric) AS total_billed_kwh,
             COUNT(DISTINCT meter_id) AS billing_meter_count
      FROM billing_monthly_detail
      WHERE consumption_kwh IS NOT NULL
      GROUP BY center_name, year, month
    ),
    measured_agg AS (
      SELECT m.building_id, b.name AS building_name,
             EXTRACT(YEAR FROM a.bucket)::int AS year,
             EXTRACT(MONTH FROM a.bucket)::int AS month,
             SUM((a.max_energy_kwh - a.min_energy_kwh))::numeric AS total_measured_kwh,
             COUNT(DISTINCT a.meter_id) AS measured_meter_count
      FROM agg_meter_hourly a
      JOIN meters m ON a.meter_id = m.id
      JOIN buildings b ON m.building_id = b.id
      GROUP BY m.building_id, b.name, EXTRACT(YEAR FROM a.bucket), EXTRACT(MONTH FROM a.bucket)
    )
    SELECT
      ba.center_name,
      ba.year, ba.month,
      ba.billing_meter_count,
      ROUND(ba.total_billed_kwh, 0) AS billed_kwh,
      ma.building_name,
      COALESCE(ma.measured_meter_count, 0) AS measured_meter_count,
      ROUND(COALESCE(ma.total_measured_kwh, 0), 0) AS measured_kwh,
      CASE WHEN ma.total_measured_kwh IS NULL THEN 'NO_MATCH'
           WHEN ba.total_billed_kwh = 0 THEN 'ZERO_BILLED'
           ELSE ROUND(((ma.total_measured_kwh - ba.total_billed_kwh) / NULLIF(ba.total_billed_kwh, 0) * 100)::numeric, 1)::text || '%'
      END AS diff_pct
    FROM billing_agg ba
    LEFT JOIN measured_agg ma ON (
      LOWER(ba.center_name) LIKE '%' || LOWER(SUBSTRING(ma.building_name FROM 1 FOR 10)) || '%'
      OR LOWER(ma.building_name) LIKE '%' || LOWER(SUBSTRING(ba.center_name FROM 1 FOR 10)) || '%'
    ) AND ba.year = ma.year AND ba.month = ma.month
    ORDER BY ba.center_name, ba.year, ba.month
    LIMIT 30
  `);

  if (summaryQuery.rows.length === 0) {
    console.log('  Sin datos de resumen');
  } else {
    console.log('  Centro Billing | Building | Año | Mes | Meters(B/M) | kWh Facturado | kWh Medido | Diff%');
    console.log('  ' + '-'.repeat(110));
    summaryQuery.rows.forEach(r => {
      console.log(`  ${(r.center_name || '').substring(0, 22).padEnd(22)} | ${(r.building_name || 'N/A').substring(0, 12).padEnd(12)} | ${r.year} | ${String(r.month).padStart(2)} | ${String(r.billing_meter_count).padStart(3)}/${String(r.measured_meter_count).padStart(3)} | ${String(r.billed_kwh).padStart(13)} | ${String(r.measured_kwh).padStart(10)} | ${r.diff_pct}`);
    });
  }

  // 12. Meter IDs in billing that don't exist in meters
  const missingMeters = await client.query(`
    SELECT DISTINCT b.meter_id
    FROM billing_monthly_detail b
    WHERE b.meter_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM meters m WHERE TRIM(LOWER(m.id)) = TRIM(LOWER(b.meter_id)))
    ORDER BY b.meter_id
    LIMIT 30
  `);
  console.log(`\n=== METER_IDs EN BILLING SIN MATCH EN METERS ===`);
  console.log(`  Total: ${missingMeters.rows.length}${missingMeters.rows.length >= 30 ? '+' : ''}`);
  missingMeters.rows.forEach(r => console.log(`    - "${r.meter_id}"`));

  // 13. Meter IDs in meters that don't exist in billing
  const missingInBilling = await client.query(`
    SELECT m.id, m.building_id
    FROM meters m
    WHERE NOT EXISTS (SELECT 1 FROM billing_monthly_detail b WHERE TRIM(LOWER(b.meter_id)) = TRIM(LOWER(m.id)))
    ORDER BY m.id
    LIMIT 30
  `);
  console.log(`\n=== METER_IDs EN METERS SIN FACTURACIÓN ===`);
  console.log(`  Total: ${missingInBilling.rows.length}${missingInBilling.rows.length >= 30 ? '+' : ''}`);
  missingInBilling.rows.slice(0, 15).forEach(r => console.log(`    - "${r.id}" (building: ${r.building_id})`));
  if (missingInBilling.rows.length > 15) console.log(`    ... (${missingInBilling.rows.length - 15} más)`);

  await client.end();
  console.log('\nDone.');
}

run().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
