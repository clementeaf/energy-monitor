/**
 * load-meter-readings.mjs — Carga lecturas cada 15 min de las 43 tiendas reales
 * en tabla particionada por meter_id. ~1.5M filas esperadas.
 *
 * Uso: node load-meter-readings.mjs
 */

import pg from 'pg';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const { Client } = pg;
const CSV = '/Users/clementefalcone/Desktop/hoktus/energy-monitor/MALL_GRANDE_446_completo.csv';
const REAL_METERS = Array.from({ length: 43 }, (_, i) => `MG-${String(i + 1).padStart(3, '0')}`);
const REAL_SET = new Set(REAL_METERS);
const BATCH_SIZE = 5000;

const client = new Client({
  host: '127.0.0.1', port: 5434,
  database: 'arauco', user: 'postgres', password: 'arauco',
});

await client.connect();
console.log('Connected');

// 1. Crear tabla particionada
await client.query(`
  CREATE TABLE IF NOT EXISTS meter_readings (
    meter_id VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    voltage_l1 NUMERIC(7,2),
    voltage_l2 NUMERIC(7,2),
    voltage_l3 NUMERIC(7,2),
    current_l1 NUMERIC(8,3),
    current_l2 NUMERIC(8,3),
    current_l3 NUMERIC(8,3),
    power_kw NUMERIC(10,3),
    reactive_power_kvar NUMERIC(10,3),
    power_factor NUMERIC(5,3),
    frequency_hz NUMERIC(6,3),
    energy_kwh_total NUMERIC(14,3),
    PRIMARY KEY (meter_id, timestamp)
  ) PARTITION BY LIST (meter_id)
`);

// 2. Crear partición por cada medidor real
for (const m of REAL_METERS) {
  const partName = `meter_readings_${m.replace('-', '_').toLowerCase()}`;
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${partName}
    PARTITION OF meter_readings FOR VALUES IN ('${m}')
  `);
}
console.log(`43 partitions created`);

// 3. Cargar CSV
const rl = createInterface({ input: createReadStream(CSV, { encoding: 'latin1' }) });
let batch = [];
let lineNum = 0;
let totalRows = 0;
let skipped = 0;

const parse = (v) => parseFloat((v || '0').replace(',', '.'));

for await (const line of rl) {
  lineNum++;
  if (lineNum === 1) continue;

  const c = line.split(';');
  if (!REAL_SET.has(c[1])) { skipped++; continue; }

  batch.push([
    c[1], c[0],
    parse(c[10]), parse(c[11]), parse(c[12]),
    parse(c[13]), parse(c[14]), parse(c[15]),
    parse(c[16]), parse(c[17]), parse(c[18]),
    parse(c[19]), parse(c[20]),
  ]);

  if (batch.length >= BATCH_SIZE) {
    await insertBatch(batch);
    totalRows += batch.length;
    batch = [];
    if (totalRows % 100000 === 0) console.log(`  ${(totalRows / 1000).toFixed(0)}K loaded...`);
  }
}
if (batch.length > 0) { await insertBatch(batch); totalRows += batch.length; }

console.log(`\nDone. ${totalRows.toLocaleString()} rows loaded, ${skipped.toLocaleString()} skipped`);

// 4. Verificar
const { rows } = await client.query(`
  SELECT COUNT(*) AS total, COUNT(DISTINCT meter_id) AS meters,
    MIN(timestamp)::date AS from_date, MAX(timestamp)::date AS to_date
  FROM meter_readings
`);
console.table(rows);
await client.end();

async function insertBatch(rows) {
  const cols = 13;
  const values = [];
  const placeholders = rows.map((r, i) => {
    values.push(...r);
    return `(${Array.from({ length: cols }, (_, j) => `$${i * cols + j + 1}`).join(',')})`;
  });
  await client.query(
    `INSERT INTO meter_readings (
      meter_id, timestamp, voltage_l1, voltage_l2, voltage_l3,
      current_l1, current_l2, current_l3, power_kw, reactive_power_kvar,
      power_factor, frequency_hz, energy_kwh_total
    ) VALUES ${placeholders.join(',')} ON CONFLICT DO NOTHING`, values,
  );
}
