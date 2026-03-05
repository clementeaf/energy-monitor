/**
 * Import readings from CSV into RDS via direct connection.
 * Run: node sql/import-readings.mjs <csv-path>
 *
 * Requires: npm install pg (or use the Lambda approach)
 */
import { readFileSync } from 'fs';
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
  ssl: { rejectUnauthorized: false },
});

function parseNum(v) {
  if (!v || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

async function run() {
  const csv = readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split('\n').filter(l => l.trim());
  const header = lines[0].split(',');
  const rows = lines.slice(1);

  console.log(`Parsed ${rows.length} rows from CSV`);

  await client.connect();
  console.log('Connected to RDS');

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

      values.push(`($${paramIdx},$${paramIdx+1},$${paramIdx+2},$${paramIdx+3},$${paramIdx+4},$${paramIdx+5},$${paramIdx+6},$${paramIdx+7},$${paramIdx+8},$${paramIdx+9},$${paramIdx+10},$${paramIdx+11},$${paramIdx+12},$${paramIdx+13},$${paramIdx+14},$${paramIdx+15})`);
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
      );
      paramIdx += 16;
    }

    const sql = `INSERT INTO readings (meter_id, timestamp, voltage_l1, voltage_l2, voltage_l3, current_l1, current_l2, current_l3, power_kw, reactive_power_kvar, power_factor, frequency_hz, energy_kwh_total, thd_voltage_pct, thd_current_pct, phase_imbalance_pct) VALUES ${values.join(',')}`;
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
