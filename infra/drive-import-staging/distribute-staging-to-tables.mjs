/**
 * Distribuye datos de readings_import_staging (tabla gigante) a tiendas y analisis.
 * Por trozos: tiendas por source_file; analisis por día y por batches de filas.
 * Uso: DB_HOST=127.0.0.1 DB_PORT=5433 node distribute-staging-to-tables.mjs
 * Env: PHASE=tiendas|analisis|all (default all), DRY_RUN=true, BATCH_READ=50000
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const PHASE = process.env.PHASE || 'all';
const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_READ = Math.max(1000, parseInt(process.env.BATCH_READ || '50000', 10));
const FROM_DATE = process.env.FROM_DATE;
const TO_DATE = process.env.TO_DATE;

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getSecretJson(secretId) {
  const client = new SecretsManagerClient({ region: REGION });
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!res.SecretString) throw new Error(`Secret ${secretId} has no SecretString`);
  return JSON.parse(res.SecretString);
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

/**
 * Asegura que cada centro en staging_centers exista en buildings (para FK de tiendas).
 */
async function ensureBuildingsFromStaging(client) {
  const rows = await client.query(
    `SELECT id, center_name FROM staging_centers WHERE id NOT IN (SELECT id FROM buildings)`
  );
  if (rows.rows.length === 0) return;
  console.log(`[tiendas] Creando ${rows.rows.length} edificios desde staging_centers...`);
  for (const r of rows.rows) {
    await client.query(
      `INSERT INTO buildings (id, name, address, total_area) VALUES ($1, $2, '', 0) ON CONFLICT (id) DO NOTHING`,
      [r.id, r.center_name]
    );
  }
}

/**
 * Fase 1: Llena tiendas desde staging. Un solo GROUP BY (un full scan, resultado pequeño).
 */
async function phaseTiendas(client) {
  await ensureBuildingsFromStaging(client);

  console.log('[tiendas] Obteniendo distintos center_name, store_type, store_name (GROUP BY)...');
  const res = await client.query(
    `SELECT center_name, store_type, store_name
     FROM readings_import_staging
     GROUP BY center_name, store_type, store_name
     ORDER BY center_name, store_type, store_name`
  );
  const rows = res.rows;
  console.log(`[tiendas] ${rows.length} combinaciones distintas.`);

  if (rows.length === 0) {
    console.log('[tiendas] No hay datos en staging.');
    return;
  }

  const buildingIds = new Set((await client.query('SELECT id FROM buildings')).rows.map((r) => r.id));
  let inserted = 0;
  let skipped = 0;

  for (const r of rows) {
    const center_name = r.center_name;
    const store_type = r.store_type;
    const store_name = r.store_name;
    const building_id = slugify(center_name);
    if (!buildingIds.has(building_id)) {
      skipped++;
      continue;
    }
    if (DRY_RUN) {
      inserted++;
      continue;
    }
    try {
      const result = await client.query(
        `INSERT INTO tiendas (building_id, store_type, store_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (building_id, store_type, store_name) DO NOTHING`,
        [building_id, store_type || '', store_name || '']
      );
      inserted += result.rowCount || 0;
    } catch (err) {
      if (err.code === '23503') skipped++;
      else throw err;
    }
  }

  if (!DRY_RUN && inserted > 0) {
    const count = (await client.query('SELECT COUNT(*) AS n FROM tiendas')).rows[0].n;
    console.log(`[tiendas] Tiendas en tabla: ${count}`);
  }
  console.log(`[tiendas] Listo. Insertados/skip: ${inserted}/${skipped}`);
}

/**
 * Asegura que cada medidor distinto en staging exista en meters (para FK de analisis).
 */
async function ensureMetersFromStaging(client) {
  const existing = new Set((await client.query('SELECT id FROM meters')).rows.map((r) => r.id));
  console.log('[analisis] Medidores ya en tabla meters:', existing.size);

  console.log('[analisis] Obteniendo distintos meter_id desde staging...');
  const rows = await client.query(`
    SELECT DISTINCT ON (meter_id) meter_id, center_name, model, phase_type, uplink_route, modbus_address
    FROM readings_import_staging
    ORDER BY meter_id, id
  `);
  let inserted = 0;
  for (const r of rows.rows) {
    if (existing.has(r.meter_id)) continue;
    const building_id = slugify(r.center_name);
    try {
      const result = await client.query(
        `INSERT INTO meters (id, building_id, model, phase_type, bus_id, modbus_address, uplink_route, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'online')
         ON CONFLICT (id) DO NOTHING`,
        [r.meter_id, building_id, r.model || 'unknown', r.phase_type || '3P', `${building_id}-Bus1`, r.modbus_address ?? 0, r.uplink_route || '']
      );
      if ((result.rowCount || 0) > 0) {
        existing.add(r.meter_id);
        inserted++;
      }
    } catch (err) {
      if (err.code === '23503') continue;
      throw err;
    }
  }
  if (inserted > 0) console.log(`[analisis] Creados ${inserted} medidores desde staging.`);
}

/**
 * Fase 2: Llena analisis (por meter_id, día) desde staging, por día y por batches.
 * Usa los datos de los medidores: meter_id, timestamp, power_kw, energy_kwh_total.
 */
async function phaseAnalisis(client) {
  await ensureMetersFromStaging(client);

  const countRes = await client.query(
    `SELECT COUNT(*)::bigint AS total FROM readings_import_staging`
  );
  const totalRows = Number(countRes.rows[0].total);
  console.log(`[analisis] Total filas a leer en staging: ${totalRows.toLocaleString('es-CL')}`);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_analisis_meter_day
    ON analisis (meter_id, period_type, period_start) WHERE meter_id IS NOT NULL
  `);

  console.log('[analisis] Rango de fechas en staging...');
  const range = await client.query(
    `SELECT MIN(timestamp) AS min_ts, MAX(timestamp) AS max_ts FROM readings_import_staging`
  );
  let minTs = range.rows[0]?.min_ts;
  let maxTs = range.rows[0]?.max_ts;
  if (!minTs || !maxTs) {
    console.log('[analisis] No hay datos en staging.');
    return;
  }
  if (FROM_DATE) {
    const from = new Date(FROM_DATE);
    if (from > minTs) minTs = from;
  }
  if (TO_DATE) {
    const to = new Date(TO_DATE);
    to.setUTCHours(23, 59, 59, 999);
    if (to < maxTs) maxTs = to;
  }
  if (FROM_DATE || TO_DATE) {
    console.log(`[analisis] Ventana: ${new Date(minTs).toISOString().slice(0, 10)} .. ${new Date(maxTs).toISOString().slice(0, 10)}`);
  }

  const dayMs = 24 * 60 * 60 * 1000;
  let current = new Date(minTs);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(maxTs);
  end.setUTCHours(23, 59, 59, 999);

  let totalInserted = 0;
  let daysProcessed = 0;

  while (current <= end) {
    const dayStart = new Date(current);
    const dayEnd = new Date(current.getTime() + dayMs);
    const dayStartStr = dayStart.toISOString();
    const dayEndStr = dayEnd.toISOString();

    const byMeter = new Map();

    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await client.query(
        `SELECT meter_id, timestamp, power_kw, energy_kwh_total
         FROM readings_import_staging
         WHERE timestamp >= $1 AND timestamp < $2
         ORDER BY meter_id, timestamp
         LIMIT $3 OFFSET $4`,
        [dayStartStr, dayEndStr, BATCH_READ, offset]
      );

      for (const r of res.rows) {
        const mid = r.meter_id;
        if (!byMeter.has(mid)) {
          byMeter.set(mid, { minEnergy: null, maxEnergy: null, sumPower: 0, count: 0, maxPower: null });
        }
        const agg = byMeter.get(mid);
        const en = Number(r.energy_kwh_total);
        const pw = Number(r.power_kw);
        if (agg.minEnergy == null || en < agg.minEnergy) agg.minEnergy = en;
        if (agg.maxEnergy == null || en > agg.maxEnergy) agg.maxEnergy = en;
        agg.sumPower += pw;
        agg.count++;
        if (agg.maxPower == null || pw > agg.maxPower) agg.maxPower = pw;
      }

      offset += res.rows.length;
      hasMore = res.rows.length === BATCH_READ;
    }

    if (!DRY_RUN && byMeter.size > 0) {
      const BATCH_INSERT = 100;
      const rows = [];
      for (const [meter_id, agg] of byMeter) {
        const consumption_kwh = agg.maxEnergy != null && agg.minEnergy != null ? agg.maxEnergy - agg.minEnergy : null;
        const avg_power_kw = agg.count > 0 ? agg.sumPower / agg.count : null;
        rows.push([
          meter_id,
          dayStartStr,
          dayEndStr,
          consumption_kwh,
          avg_power_kw != null ? Math.round(avg_power_kw * 1000) / 1000 : null,
          agg.maxPower,
          agg.count,
        ]);
      }
      for (let i = 0; i < rows.length; i += BATCH_INSERT) {
        const chunk = rows.slice(i, i + BATCH_INSERT);
        const placeholders = chunk.map((_, j) => {
          const o = j * 7;
          return `($${o + 1}, 'day', $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7})`;
        }).join(', ');
        const params = chunk.flat();
        await client.query(
          `INSERT INTO analisis (meter_id, period_type, period_start, period_end, consumption_kwh, avg_power_kw, peak_demand_kw, num_readings)
           VALUES ${placeholders}
           ON CONFLICT (meter_id, period_type, period_start) WHERE meter_id IS NOT NULL DO NOTHING`,
          params
        );
      }
      totalInserted += byMeter.size;
    }

    daysProcessed++;
    if (daysProcessed % 30 === 0) console.log(`[analisis] Días procesados: ${daysProcessed} (${dayStartStr})`);
    current = dayEnd;
  }

  console.log(`[analisis] Listo. Días: ${daysProcessed}, filas analisis insertadas: ${totalInserted}`);
}

async function main() {
  const secret = await getSecretJson(DB_SECRET_NAME);
  const client = new Client(buildDbConfig(secret));
  await client.connect();

  if (DRY_RUN) console.log('DRY_RUN: no se escribirá en tiendas/analisis.\n');

  if (PHASE === 'tiendas' || PHASE === 'all') await phaseTiendas(client);
  if (PHASE === 'analisis' || PHASE === 'all') await phaseAnalisis(client);

  await client.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
