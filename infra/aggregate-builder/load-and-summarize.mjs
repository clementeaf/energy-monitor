import pg from 'pg';
const { Client } = pg;

const CSV = '/Users/clementefalcone/Desktop/hoktus/energy-monitor/MALL_GRANDE_446_completo.csv';

const client = new Client({
  host: '127.0.0.1', port: 5434,
  database: 'arauco', user: 'postgres', password: 'arauco',
});

await client.connect();
console.log('Connected');

// 1. Crear tabla de carga
await client.query(`
  CREATE TABLE IF NOT EXISTS raw_readings (
    timestamp TIMESTAMPTZ,
    meter_id TEXT,
    power_kw NUMERIC,
    reactive_power_kvar NUMERIC,
    power_factor NUMERIC,
    energy_kwh_total NUMERIC
  )
`);
await client.query('TRUNCATE raw_readings');
console.log('Table ready');

// 2. Cargar CSV (solo columnas necesarias)
const { createReadStream } = await import('fs');
const { createInterface } = await import('readline');
const { createReadStream: createRS } = await import('fs');

const rl = createInterface({ input: createReadStream(CSV, { encoding: 'latin1' }) });
let batch = [];
let lineNum = 0;
let totalRows = 0;

for await (const line of rl) {
  lineNum++;
  if (lineNum === 1) continue; // skip header

  const cols = line.split(';');
  // cols: 0=timestamp, 1=meter_id, 16=power_kw, 17=reactive_power_kvar, 18=power_factor, 20=energy_kwh_total
  const ts = cols[0];
  const meter = cols[1];
  const powerKw = parseFloat((cols[16] || '0').replace(',', '.'));
  const reactiveKvar = parseFloat((cols[17] || '0').replace(',', '.'));
  const pf = parseFloat((cols[18] || '0').replace(',', '.'));
  const energyKwh = parseFloat((cols[20] || '0').replace(',', '.'));

  batch.push([ts, meter, powerKw, reactiveKvar, pf, energyKwh]);

  if (batch.length >= 5000) {
    await insertBatch(batch);
    totalRows += batch.length;
    batch = [];
    if (totalRows % 500000 === 0) console.log(`  ${(totalRows / 1000000).toFixed(1)}M rows loaded...`);
  }
}
if (batch.length > 0) {
  await insertBatch(batch);
  totalRows += batch.length;
}
console.log(`Loaded ${totalRows.toLocaleString()} rows`);

async function insertBatch(rows) {
  const values = [];
  const placeholders = rows.map((r, i) => {
    const offset = i * 6;
    values.push(...r);
    return `($${offset+1},$${offset+2},$${offset+3},$${offset+4},$${offset+5},$${offset+6})`;
  });
  await client.query(
    `INSERT INTO raw_readings (timestamp, meter_id, power_kw, reactive_power_kvar, power_factor, energy_kwh_total)
     VALUES ${placeholders.join(',')}`,
    values,
  );
}

// 3. Calcular resumen mensual
console.log('Calculating monthly summary...');
await client.query(`
  INSERT INTO building_summary
  SELECT
    'Parque Arauco Kennedy',
    date_trunc('month', timestamp)::date,
    43, 16, 446, 43, 403,
    SUM(delta_kwh),
    SUM(power_kw),
    AVG(power_kw),
    MAX(power_kw),
    SUM(reactive_power_kvar),
    AVG(power_factor),
    NULL
  FROM (
    SELECT
      timestamp, meter_id, power_kw, reactive_power_kvar, power_factor,
      energy_kwh_total - LAG(energy_kwh_total) OVER (PARTITION BY meter_id ORDER BY timestamp) AS delta_kwh
    FROM raw_readings
  ) sub
  WHERE delta_kwh >= 0
  GROUP BY date_trunc('month', timestamp)::date
  ON CONFLICT (building_name, month) DO UPDATE SET
    total_kwh = EXCLUDED.total_kwh,
    total_power_kw = EXCLUDED.total_power_kw,
    avg_power_kw = EXCLUDED.avg_power_kw,
    peak_power_kw = EXCLUDED.peak_power_kw,
    total_reactive_kvar = EXCLUDED.total_reactive_kvar,
    avg_power_factor = EXCLUDED.avg_power_factor
`);

// 4. Demanda máxima (sum de todos los medidores en cada instante)
console.log('Calculating peak demand...');
await client.query(`
  UPDATE building_summary bs
  SET peak_demand_kw = sub.peak
  FROM (
    SELECT
      date_trunc('month', timestamp)::date AS month,
      MAX(total_kw) AS peak
    FROM (
      SELECT timestamp, SUM(power_kw) AS total_kw
      FROM raw_readings
      GROUP BY timestamp
    ) instant
    GROUP BY date_trunc('month', timestamp)::date
  ) sub
  WHERE bs.month = sub.month
`);

// 5. Mostrar resultado
const { rows } = await client.query('SELECT * FROM building_summary ORDER BY month');
console.log('\n=== Building Summary ===');
console.table(rows);

await client.end();
