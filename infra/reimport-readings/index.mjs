import { readFileSync } from 'fs';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseNum(v) {
  if (!v || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function parseStr(v) {
  if (!v || v === '') return null;
  return v;
}

export const handler = async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: getPgSslOptionsForRds(),
  });

  await client.connect();

  try {
    // 1. ALTER TABLE — add 7 missing columns
    console.log('Adding missing columns...');
    await client.query(`
      ALTER TABLE readings
        ADD COLUMN IF NOT EXISTS breaker_status     VARCHAR(10),
        ADD COLUMN IF NOT EXISTS digital_input_1    SMALLINT,
        ADD COLUMN IF NOT EXISTS digital_input_2    SMALLINT,
        ADD COLUMN IF NOT EXISTS digital_output_1   SMALLINT,
        ADD COLUMN IF NOT EXISTS digital_output_2   SMALLINT,
        ADD COLUMN IF NOT EXISTS alarm              VARCHAR(50),
        ADD COLUMN IF NOT EXISTS modbus_crc_errors  INTEGER;
    `);
    console.log('Columns added.');

    // 2. Get the timestamp range of the CSV data to delete only those
    // CSV is Jan 1 2026 to ~Mar 2 2026
    console.log('Deleting old CSV readings...');
    const del = await client.query(`
      DELETE FROM readings WHERE timestamp < '2026-03-02T00:00:00Z'
    `);
    console.log(`Deleted ${del.rowCount} old rows.`);

    // 3. Read CSV and re-import with all columns
    const csvPath = join(__dirname, 'energy_meters_15devices_2months.csv');
    const csv = readFileSync(csvPath, 'utf-8');
    const lines = csv.split('\n').filter(l => l.trim());
    const header = lines[0].split(',');
    const rows = lines.slice(1);
    console.log(`CSV has ${rows.length} rows, ${header.length} columns`);

    const BATCH_SIZE = 1000;
    const COLS_PER_ROW = 23; // 23 DB columns (excluding id)
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

    // 4. Update last_reading_at on meters
    await client.query(`
      UPDATE meters m SET last_reading_at = sub.max_ts
      FROM (SELECT meter_id, MAX(timestamp) as max_ts FROM readings GROUP BY meter_id) sub
      WHERE m.id = sub.meter_id
    `);
    console.log('Updated meters.last_reading_at');

    return {
      columnsAdded: 7,
      deleted: del.rowCount,
      imported,
      totalCsvRows: rows.length,
    };
  } finally {
    await client.end();
  }
};
