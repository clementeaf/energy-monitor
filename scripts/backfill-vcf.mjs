/**
 * Backfill voltage, current, frequency from `readings` → `meter_readings` in RDS.
 * Runs in batches per meter to avoid locking.
 *
 * Usage:
 *   DB_HOST=energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com \
 *   DB_USER=emadmin DB_PASSWORD=EmAdmin2026Prod DB_NAME=energy_monitor \
 *   node scripts/backfill-vcf.mjs
 */
import pg from 'pg';
import { getPgSslOptionsForRds } from '../infra/lib/rds-ssl.mjs';
const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'energy_monitor',
  user: process.env.DB_USER || 'emadmin',
  password: process.env.DB_PASSWORD,
  ssl: getPgSslOptionsForRds(),
});

await client.connect();
console.log('Connected.');

// 1. Find meters with null voltage in meter_readings that have data in readings
const { rows: meters } = await client.query(`
  SELECT DISTINCT mr.meter_id
  FROM meter_readings mr
  WHERE mr.voltage_l1 IS NULL
    AND EXISTS (
      SELECT 1 FROM readings r
      WHERE r.meter_id = mr.meter_id AND r.voltage_l1 IS NOT NULL
      LIMIT 1
    )
  ORDER BY mr.meter_id
`);

console.log(`Meters to backfill: ${meters.length}`);

let totalUpdated = 0;
for (const { meter_id } of meters) {
  const start = Date.now();
  const { rowCount } = await client.query(`
    UPDATE meter_readings mr
    SET voltage_l1 = r.voltage_l1,
        voltage_l2 = r.voltage_l2,
        voltage_l3 = r.voltage_l3,
        current_l1 = r.current_l1,
        current_l2 = r.current_l2,
        current_l3 = r.current_l3,
        frequency_hz = r.frequency_hz
    FROM readings r
    WHERE mr.meter_id = $1
      AND r.meter_id = mr.meter_id
      AND r.timestamp = mr.timestamp
      AND mr.voltage_l1 IS NULL
  `, [meter_id]);
  totalUpdated += rowCount;
  const ms = Date.now() - start;
  if (rowCount > 0) {
    console.log(`  ${meter_id}: ${rowCount} rows updated (${ms}ms)`);
  }
}

console.log(`\nDone. Total updated: ${totalUpdated}`);

// Verify
const { rows: check } = await client.query(`
  SELECT
    LEFT(meter_id, 2) AS prefix,
    COUNT(*) AS total,
    COUNT(voltage_l1) AS has_v,
    COUNT(frequency_hz) AS has_f
  FROM meter_readings
  GROUP BY LEFT(meter_id, 2)
  ORDER BY prefix
`);
console.log('\nVerification (meter_readings):');
console.log('Prefix | Total     | Has Voltage | Has Freq');
for (const r of check) {
  console.log(`  ${r.prefix}   | ${String(r.total).padStart(9)} | ${String(r.has_v).padStart(11)} | ${String(r.has_f).padStart(8)}`);
}

await client.end();
