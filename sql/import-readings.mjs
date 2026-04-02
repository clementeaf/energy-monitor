/**
 * Import readings from CSV into RDS via direct connection.
 * Run: node sql/import-readings.mjs <csv-path>
 *
 * Requires: npm install pg (or use the Lambda approach)
 */
import { readFileSync } from 'fs';
import { getPgSslOptionsForRds } from '../infra/lib/rds-ssl.mjs';
import pg from 'pg';

const { Client } = pg;

const CSV_PATH = process.argv[2] || '/tmp/energy-data/energy_meters_15devices_2months.csv';
const BATCH_SIZE = 1000;

const client = new Client({
  host: process.env.DB_HOST || 'energy-monitor-db.ci1q4okokkkd.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'energy_monitor',
  user: process.env.DB_USERNAME || 'emadmin',
  password: process.env.DB_PASSWORD || '',
  ssl: getPgSslOptionsForRds(),
});

function parseNum(v) {
  if (!v || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function parseStr(v) {
  if (!v || v === '') return null;
  return v;
}

async function run() {
  const csv = readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());
  const header = lines[0].split(',');
  const rows = lines.slice(1);

  console.log(`Parsed ${rows.length} rows from CSV (${header.length} columns)`);

  await client.connect();
  console.log('Connected to RDS');

  const COLS_PER_ROW = 23;
  let imported = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const line of batch) {
      const cols = line.split(',');
      const row = {};
      header.forEach((h, idx) => { row[h] = cols[idx]; });

      const placeholders = [];
      for (let p = 0; p < COLS_PER_ROW; p++) {
        placeholders.push(`$${paramIdx++}`);
      }
      values.push(`(${placeholders.join(',')})`);

      params.push(
        row.meter_id,
        row.timestamp,
        parseNum(row.voltage_L1),
        parseNum(row.voltage_L2),
        parseNum(row.voltage_L3),
        parseNum(row.current_L1),
        parseNum(row.current_L2),
        parseNum(row.current_L3),
        parseNum(row.power_kW) ?? 0,
        parseNum(row.reactive_power_kvar),
        parseNum(row.power_factor),
        parseNum(row.frequency_Hz),
        parseNum(row.energy_kWh_total) ?? 0,
        parseNum(row.thd_voltage_pct),
        parseNum(row.thd_current_pct),
        parseNum(row.phase_imbalance_pct),
        parseStr(row.breaker_status),
        parseNum(row.digital_input_1),
        parseNum(row.digital_input_2),
        parseNum(row.digital_output_1),
        parseNum(row.digital_output_2),
        parseStr(row.alarm),
        parseNum(row.modbus_crc_errors),
      );
    }

    const sql = `INSERT INTO readings (
      meter_id, timestamp,
      voltage_l1, voltage_l2, voltage_l3,
      current_l1, current_l2, current_l3,
      power_kw, reactive_power_kvar, power_factor, frequency_hz,
      energy_kwh_total, thd_voltage_pct, thd_current_pct, phase_imbalance_pct,
      breaker_status, digital_input_1, digital_input_2,
      digital_output_1, digital_output_2, alarm, modbus_crc_errors
    ) VALUES ${values.join(',')}`;
    await client.query(sql, params);
    imported += batch.length;
    if (imported % 10000 === 0 || i + BATCH_SIZE >= rows.length) {
      console.log(`  Imported ${imported}/${rows.length}`);
    }
  }

  // Update last_reading_at on meters
  await client.query(`
    UPDATE meters m SET last_reading_at = sub.max_ts
    FROM (SELECT meter_id, MAX(timestamp) as max_ts FROM readings GROUP BY meter_id) sub
    WHERE m.id = sub.meter_id
  `);

  console.log('Updated meters.last_reading_at');
  await client.end();
  console.log(`Done. ${imported} readings imported.`);
}

run().catch(err => { console.error(err); process.exit(1); });
