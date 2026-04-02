/**
 * Consulta directa a la BD: qué hay en readings y readings_import_staging
 * (potencia, energía, voltaje) y por qué la API puede devolver 0 puntos.
 *
 * Uso (túnel abierto; credenciales en backend/.env o infra/db-verify/.env):
 *   node infra/db-verify/query-readings-direct.mjs
 *   cd infra/db-verify && node query-readings-direct.mjs
 *
 * Con Secrets Manager + túnel:
 *   DB_USE_SECRET=1 DB_HOST=127.0.0.1 DB_PORT=5433 node query-readings-direct.mjs
 */

import dotenv from 'dotenv';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '../../backend/.env') });

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';

function useLocalCredentials() {
  if (process.env.DB_USE_SECRET === '1') return false;
  const user = process.env.DB_USER || process.env.DB_USERNAME;
  const pass = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  return Boolean(host && user && pass);
}

async function getSecretJson(secretId) {
  const client = new SecretsManagerClient({ region: REGION });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) throw new Error(`Secret ${secretId} has no SecretString`);
  return JSON.parse(response.SecretString);
}

function buildDbConfig(secret, secretOnly = false) {
  if (secretOnly) {
    return {
      host: process.env.DB_HOST || secret.host || secret.DB_HOST,
      port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
      database: process.env.DB_NAME || secret.dbname || secret.database || secret.DB_NAME,
      user: secret.username || secret.user || secret.DB_USERNAME,
      password: secret.password || secret.DB_PASSWORD,
      ssl: getPgSslOptionsForRds(),
    };
  }
  return {
    host: process.env.DB_HOST || secret.host || secret.DB_HOST,
    port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
    database: process.env.DB_NAME || secret.dbname || secret.database || secret.DB_NAME,
    user: process.env.DB_USER || process.env.DB_USERNAME || secret.username || secret.user || secret.DB_USERNAME,
    password: process.env.DB_PASSWORD || secret.password || secret.DB_PASSWORD,
    ssl: getPgSslOptionsForRds(),
  };
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log('  ' + title);
  console.log('='.repeat(60));
}

async function run(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function main() {
  console.log('Consulta directa: readings vs readings_import_staging (MG-001, fechas, edificios)\n');

  let config;
  if (useLocalCredentials()) {
    config = {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      ssl: getPgSslOptionsForRds(),
    };
  } else {
    console.log('Usando Secrets Manager:', DB_SECRET_NAME);
    const secret = await getSecretJson(DB_SECRET_NAME);
    const useTunnel = Boolean(process.env.DB_HOST);
    config = buildDbConfig(secret, useTunnel);
    if (useTunnel) console.log('  Host/port desde env (túnel):', config.host, config.port);
  }

  const client = new Client(config);
  try {
    await client.connect();
  } catch (err) {
    console.error('No se pudo conectar:', err?.message);
    console.error('Revisa .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD) y túnel SSH si aplica.');
    process.exit(1);
  }

  try {
    // ─── 1. Conteos globales y rango temporal ─────────────────────────────
    section('1. Tabla readings (fuente por defecto del backend)');

    let rows = await run(
      client,
      `SELECT COUNT(*)::bigint AS total,
              MIN(timestamp)::text AS min_ts,
              MAX(timestamp)::text AS max_ts
       FROM readings`,
    );
    console.log('  Total filas:', Number(rows[0].total).toLocaleString('es-CL'));
    console.log('  Min timestamp:', rows[0].min_ts ?? 'NULL');
    console.log('  Max timestamp:', rows[0].max_ts ?? 'NULL');

    section('2. Tabla readings_import_staging (Drive / promote)');

    let hasStaging = true;
    try {
      rows = await run(
        client,
        `SELECT COUNT(*)::bigint AS total,
                MIN(timestamp)::text AS min_ts,
                MAX(timestamp)::text AS max_ts
         FROM readings_import_staging`,
      );
      console.log('  Total filas:', Number(rows[0].total).toLocaleString('es-CL'));
      console.log('  Min timestamp:', rows[0].min_ts ?? 'NULL');
      console.log('  Max timestamp:', rows[0].max_ts ?? 'NULL');
    } catch (e) {
      hasStaging = false;
      console.log('  (tabla no existe o sin acceso:', e.message, ')');
    }

    // ─── 2b. ¿Hay datos de potencia, energía, voltaje? ──────────────────────
    section('2b. ¿Las tablas devuelven datos de POTENCIA, ENERGÍA, VOLTAJE?');

    const cols = 'timestamp, meter_id, power_kw, energy_kwh_total, voltage_l1, voltage_l2, voltage_l3';
    let readingsSample = await run(
      client,
      `SELECT ${cols} FROM readings ORDER BY timestamp DESC LIMIT 3`,
    );
    const tsStr = (t) => (t == null ? 'null' : typeof t === 'string' ? t.slice(0, 19) : t.toISOString?.()?.slice(0, 19) ?? String(t));

    if (readingsSample.length === 0) {
      console.log('  [readings]:  SIN FILAS — no hay datos de potencia/energía/voltaje.');
    } else {
      console.log('  [readings]:  SÍ — muestra (últimas 3 filas):');
      readingsSample.forEach((r, i) => {
        console.log(
          `    ${i + 1}. ${tsStr(r.timestamp)} | ${r.meter_id} | power_kw=${r.power_kw} | energy_kwh_total=${r.energy_kwh_total} | V_L1=${r.voltage_l1} V_L2=${r.voltage_l2} V_L3=${r.voltage_l3}`,
        );
      });
    }

    if (hasStaging) {
      let stagingSample = await run(
        client,
        `SELECT ${cols} FROM readings_import_staging ORDER BY timestamp DESC LIMIT 3`,
      );
      if (stagingSample.length === 0) {
        console.log('  [readings_import_staging]:  SIN FILAS — no hay datos de potencia/energía/voltaje.');
      } else {
        console.log('  [readings_import_staging]:  SÍ — muestra (últimas 3 filas):');
        stagingSample.forEach((r, i) => {
          console.log(
            `    ${i + 1}. ${tsStr(r.timestamp)} | ${r.meter_id} | power_kw=${r.power_kw} | energy_kwh_total=${r.energy_kwh_total} | V_L1=${r.voltage_l1} V_L2=${r.voltage_l2} V_L3=${r.voltage_l3}`,
          );
        });
      }
    }

    // ─── 3. Medidor MG-001 en cada tabla ───────────────────────────────────
    section('3. Medidor MG-001 (el que la API devolvió 0 lecturas)');

    rows = await run(
      client,
      `SELECT COUNT(*)::bigint AS total,
              MIN(timestamp)::text AS min_ts,
              MAX(timestamp)::text AS max_ts
       FROM readings WHERE meter_id = $1`,
      ['MG-001'],
    );
    console.log('  En tabla [readings]:');
    console.log('    Filas:', Number(rows[0].total).toLocaleString('es-CL'));
    console.log('    Rango:', rows[0].min_ts ?? 'NULL', '→', rows[0].max_ts ?? 'NULL');

    if (hasStaging) {
      rows = await run(
        client,
        `SELECT COUNT(*)::bigint AS total,
                MIN(timestamp)::text AS min_ts,
                MAX(timestamp)::text AS max_ts
         FROM readings_import_staging WHERE meter_id = $1`,
        ['MG-001'],
      );
      console.log('  En tabla [readings_import_staging]:');
      console.log('    Filas:', Number(rows[0].total).toLocaleString('es-CL'));
      console.log('    Rango:', rows[0].min_ts ?? 'NULL', '→', rows[0].max_ts ?? 'NULL');
    }

    // ─── 4. Qué meter_id hay en cada tabla (sample) ────────────────────────
    section('4. Meter_id distintos y rango por tabla (sample)');

    rows = await run(
      client,
      `SELECT meter_id, COUNT(*)::bigint AS cnt,
              MIN(timestamp)::text AS min_ts, MAX(timestamp)::text AS max_ts
       FROM readings
       GROUP BY meter_id ORDER BY meter_id LIMIT 15`,
    );
    console.log('  [readings] — primeros 15 meter_id:');
    for (const r of rows) {
      console.log('    ', r.meter_id, '→', Number(r.cnt).toLocaleString('es-CL'), 'filas', r.min_ts?.slice(0, 10), '→', r.max_ts?.slice(0, 10));
    }

    if (hasStaging) {
      rows = await run(
        client,
        `SELECT meter_id, COUNT(*)::bigint AS cnt,
                MIN(timestamp)::text AS min_ts, MAX(timestamp)::text AS max_ts
         FROM readings_import_staging
         GROUP BY meter_id ORDER BY meter_id LIMIT 15`,
      );
      console.log('  [readings_import_staging] — primeros 15 meter_id:');
      for (const r of rows) {
        console.log('    ', r.meter_id, '→', Number(r.cnt).toLocaleString('es-CL'), 'filas', r.min_ts?.slice(0, 10), '→', r.max_ts?.slice(0, 10));
      }
    }

    // ─── 5. Edificio arauco-estaci-n: meters y hierarchy ───────────────────
    section('5. Edificio arauco-estaci-n (building_id usado por la API)');

    try {
      rows = await run(
        client,
        `SELECT id FROM buildings WHERE id = $1`,
        ['arauco-estaci-n'],
      );
      if (rows.length > 0) {
        console.log('  buildings: existe id =', rows[0].id);
      } else {
        console.log('  No hay fila en [buildings] con id = arauco-estaci-n');
      }
    } catch (e) {
      console.log('  Error al consultar buildings:', e.message);
    }

    try {
      rows = await run(
        client,
        `SELECT id, building_id FROM meters WHERE building_id = $1 ORDER BY id LIMIT 20`,
        ['arauco-estaci-n'],
      );
    } catch (e) {
      rows = [];
      console.log('  Error al consultar meters:', e.message);
    }
    console.log('  Medidores en [meters] con building_id = arauco-estaci-n:', rows.length);
    if (rows.length > 0) {
      rows.slice(0, 10).forEach((r) => console.log('    ', r.id));
      if (rows.length > 10) console.log('    ... y', rows.length - 10, 'más');
    }

    rows = await run(
      client,
      `SELECT building_id, COUNT(*)::int AS node_count
       FROM hierarchy_nodes
       WHERE building_id = $1
       GROUP BY building_id`,
      ['arauco-estaci-n'],
    );
    console.log('  [hierarchy_nodes] con building_id = arauco-estaci-n:', rows[0]?.node_count ?? 0, 'nodos');

    rows = await run(
      client,
      `SELECT id, parent_id, meter_id, node_type
       FROM hierarchy_nodes
       WHERE building_id = $1 AND meter_id IS NOT NULL
       ORDER BY id LIMIT 10`,
      ['arauco-estaci-n'],
    );
    console.log('  Nodos con meter_id no nulo (sample):', rows.length);
    rows.forEach((r) => console.log('    ', r.id, 'meter_id=', r.meter_id, r.node_type));

    // ─── 6. staging_centers (origen del listado GET /buildings) ────────────
    try {
      section('6. staging_centers (origen de los id de edificio en la API)');

      rows = await run(client, `SELECT DISTINCT center_name FROM staging_centers ORDER BY center_name LIMIT 10`);
      console.log('  center_name (sample):', rows.map((r) => r.center_name).join(', '));
    } catch (_) {
      console.log('  (tabla staging_centers no existe o sin acceso)');
    }

    // ─── 7. Cruzar hierarchy_nodes vs readings: building_id y meter_id ─────
    section('7. building_id en hierarchy_nodes vs buildings/staging');

    rows = await run(
      client,
      `SELECT DISTINCT building_id FROM hierarchy_nodes ORDER BY building_id`,
    );
    console.log('  building_id distintos en [hierarchy_nodes]:', rows.length);
    rows.forEach((r) => console.log('    ', JSON.stringify(r.building_id)));

    rows = await run(client, `SELECT id FROM buildings ORDER BY id`);
    console.log('  id en [buildings]:', rows.length);
    rows.slice(0, 15).forEach((r) => console.log('    ', r.id));
    if (rows.length > 15) console.log('    ... y', rows.length - 15, 'más');

    try {
      rows = await run(
        client,
        `SELECT DISTINCT center_name FROM staging_centers ORDER BY center_name`,
      );
      console.log('  center_name en [staging_centers]:', rows.length);
      rows.forEach((r) => console.log('    ', JSON.stringify(r.center_name)));
    } catch (_) {
      console.log('  (staging_centers no disponible)');
    }

    // ─── 8. Para cada building_id de hierarchy: meter_ids en jerarquía vs en readings ─
    section('8. Por building_id: meter_ids en hierarchy vs en readings');

    const buildingIds = await run(
      client,
      `SELECT DISTINCT building_id FROM hierarchy_nodes ORDER BY building_id`,
    );

    for (const { building_id } of buildingIds) {
      const bid = building_id;
      console.log('\n  --- building_id:', JSON.stringify(bid), '---');

      const hierarchyMeters = await run(
        client,
        `SELECT DISTINCT meter_id FROM hierarchy_nodes
         WHERE building_id = $1 AND meter_id IS NOT NULL ORDER BY meter_id`,
        [bid],
      );
      const hIds = hierarchyMeters.map((r) => r.meter_id);
      console.log('  En hierarchy_nodes (meter_id no nulo):', hIds.length, 'medidores');
      if (hIds.length <= 20) {
        console.log('    ', hIds.join(', '));
      } else {
        console.log('    ', hIds.slice(0, 10).join(', '), '...', hIds.slice(-5).join(', '));
      }

      if (hIds.length === 0) {
        console.log('  En readings: (sin meter_id en jerarquía)');
        continue;
      }

      const placeholders = hIds.map((_, i) => `$${i + 1}`).join(',');
      const inReadings = await run(
        client,
        `SELECT meter_id, COUNT(*)::bigint AS cnt
         FROM readings WHERE meter_id IN (${placeholders})
         GROUP BY meter_id ORDER BY meter_id`,
        hIds,
      );
      const withData = inReadings.filter((r) => Number(r.cnt) > 0);
      const withZero = hIds.filter((id) => !inReadings.find((r) => r.meter_id === id));

      console.log('  En [readings] con datos (cnt>0):', withData.length, 'de', hIds.length);
      if (withData.length > 0 && withData.length <= 15) {
        withData.forEach((r) => console.log('    ', r.meter_id, '→', Number(r.cnt).toLocaleString('es-CL'), 'filas'));
      } else if (withData.length > 15) {
        withData.slice(0, 5).forEach((r) => console.log('    ', r.meter_id, '→', Number(r.cnt).toLocaleString('es-CL')));
        console.log('    ... y', withData.length - 5, 'más');
      }

      if (withZero.length > 0) {
        console.log('  Medidores de la jerarquía SIN filas en [readings]:', withZero.length);
        if (withZero.length <= 25) {
          console.log('    ', withZero.join(', '));
        } else {
          console.log('    ', withZero.slice(0, 12).join(', '), '...', withZero.slice(-5).join(', '));
        }
      }
    }

    // ─── 9. Todos los meter_id en readings (para comparar con hierarchy) ───
    section('9. Todos los meter_id presentes en [readings]');

    rows = await run(
      client,
      `SELECT meter_id, COUNT(*)::bigint AS cnt
       FROM readings GROUP BY meter_id ORDER BY meter_id`,
    );
    console.log('  Total meter_id distintos en readings:', rows.length);
    rows.forEach((r) => {
      console.log('    ', r.meter_id, '→', Number(r.cnt).toLocaleString('es-CL'), 'filas');
    });

    console.log('\n' + '='.repeat(60));
    console.log('  Conclusión: si un building_id tiene medidores en hierarchy pero');
    console.log('  ninguno aparece en readings, el drill-down devolverá 0 kWh.');
    console.log('='.repeat(60) + '\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
