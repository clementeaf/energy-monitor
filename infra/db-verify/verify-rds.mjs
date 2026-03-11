/**
 * verify-rds.mjs — Ejecuta consultas de verificación sobre RDS (readings, meters, buildings, hierarchy).
 *
 * Modo prueba (sin AWS ni token): crear .env en este directorio con DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.
 *   cp .env.example .env && npm run verify
 *
 * Con AWS: no definir DB_USER/DB_PASSWORD en .env; se usa DB_SECRET_NAME en Secrets Manager.
 *
 * Variables de entorno (o en .env):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME  — modo prueba (no requiere token ni AWS)
 *   AWS_REGION, DB_SECRET_NAME                       — cuando no se usan credenciales locales
 */

import 'dotenv/config';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';

function useLocalCredentials() {
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

function buildDbConfig(secret) {
  return {
    host: process.env.DB_HOST || secret.host || secret.DB_HOST,
    port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
    database: process.env.DB_NAME || secret.dbname || secret.database || secret.DB_NAME,
    user: process.env.DB_USER || process.env.DB_USERNAME || secret.username || secret.user || secret.DB_USERNAME,
    password: process.env.DB_PASSWORD || secret.password || secret.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  };
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log('  ' + title);
  console.log('='.repeat(60));
}

function table(rows, columns) {
  if (rows.length === 0) {
    console.log('  (sin filas)');
    return;
  }
  const headers = columns || Object.keys(rows[0]);
  const widths = headers.map((h) => Math.max(String(h).length, ...rows.map((r) => String(r[h] ?? '').length)));
  const sep = headers.map((h, i) => '-'.repeat(widths[i])).join('-+-');
  console.log('  ' + headers.map((h, i) => String(h).padEnd(widths[i])).join(' | '));
  console.log('  ' + sep);
  for (const row of rows) {
    console.log('  ' + headers.map((h, i) => String(row[h] ?? '').padEnd(widths[i])).join(' | '));
  }
}

async function run(client, label, sql, params = []) {
  const start = Date.now();
  const result = await client.query(sql, params);
  console.log(`  [${label}] ${result.rowCount ?? result.rows.length} fila(s) — ${Date.now() - start} ms`);
  return result.rows;
}

async function main() {
  console.log('Verify RDS — datos cargados (readings, meters, buildings, hierarchy)');

  let config;
  if (useLocalCredentials()) {
    console.log('Modo prueba: usando DB_HOST, DB_USER, DB_PASSWORD (sin AWS ni token)');
    config = {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    };
  } else {
    console.log('Secret:', DB_SECRET_NAME);
    const secret = await getSecretJson(DB_SECRET_NAME);
    config = buildDbConfig(secret);
  }

  const client = new Client(config);

  try {
    await client.connect();
  } catch (err) {
    const code = err?.code || '';
    const msg = err?.message || String(err);
    console.error('\nNo se pudo conectar a la base de datos.');
    console.error('  Error:', msg);
    if (code === 'ECONNREFUSED') {
      console.error('\n  ECONNREFUSED: no hay servicio en ' + config.host + ':' + config.port);
      console.error('  - Si usas túnel SSH, inícialo antes (ej. ssh -L 5433:rds-endpoint:5432 bastion).');
      console.error('  - Revisa DB_HOST y DB_PORT en .env');
    } else if (code === 'ETIMEDOUT') {
      console.error('\n  ETIMEDOUT: el host no responde. Revisa red, firewall o túnel.');
    } else if (msg.includes('password') || code === '28P01') {
      console.error('\n  Fallo de autenticación. Revisa DB_USER y DB_PASSWORD en .env');
    }
    console.error('\n  Archivo de configuración: infra/db-verify/.env\n');
    process.exit(1);
  }

  try {
    // ─── 1. Conteos globales ─────────────────────────────────────────────
    section('1. Conteos en RDS');

    const [readingsRes, metersRes, buildingsRes] = await Promise.all([
      client.query('SELECT COUNT(*)::bigint AS total FROM readings'),
      client.query('SELECT COUNT(*)::bigint AS total FROM meters'),
      client.query('SELECT COUNT(*)::bigint AS total FROM buildings'),
    ]);
    const readingsCount = readingsRes.rows[0];
    const metersCount = metersRes.rows[0];
    const buildingsCount = buildingsRes.rows[0];

    console.log('  readings:  ', Number(readingsCount.total).toLocaleString('es-CL'));
    console.log('  meters:    ', Number(metersCount.total).toLocaleString('es-CL'));
    console.log('  buildings: ', Number(buildingsCount.total).toLocaleString('es-CL'));

    try {
      const stagingRes = await client.query('SELECT COUNT(*)::bigint AS total FROM readings_import_staging');
      console.log('  staging:   ', Number(stagingRes.rows[0].total).toLocaleString('es-CL'), '(readings_import_staging)');
    } catch (_) {
      console.log('  staging:   (tabla readings_import_staging no existe o sin acceso)');
    }

    // ─── 2. Distribución de medidores por edificio ─────────────────────────
    section('2. Medidores por edificio (top 20)');

    const byBuilding = await run(
      client,
      'meters per building',
      `SELECT building_id, COUNT(*)::int AS meter_count
       FROM meters
       GROUP BY building_id
       ORDER BY meter_count DESC
       LIMIT 20`,
    );
    table(byBuilding, ['building_id', 'meter_count']);

    // ─── 3. Origen de datos (sample meter_id) ───────────────────────────
    section('3. Origen de datos (meter_id sample)');

    const meterIds = await run(
      client,
      'distinct meter_id',
      `SELECT DISTINCT meter_id FROM meters ORDER BY meter_id LIMIT 50`,
    );
    const ids = meterIds.map((r) => r.meter_id);
    console.log('  Primeros 50 meter_id:', ids.join(', '));
    if (ids.some((id) => id.length > 10)) {
      console.log('  ADVERTENCIA: hay meter_id con más de 10 caracteres (VARCHAR(10))');
    }

    // ─── 4. Rangos temporales por medidor (sample) ────────────────────────
    section('4. Rangos temporales (primeros 20 medidores)');

    const timeRanges = await run(
      client,
      'min/max timestamp per meter',
      `SELECT meter_id, MIN(timestamp)::text AS min_ts, MAX(timestamp)::text AS max_ts
       FROM readings
       GROUP BY meter_id
       ORDER BY meter_id
       LIMIT 20`,
    );
    table(timeRanges, ['meter_id', 'min_ts', 'max_ts']);

    // ─── 5. Jerarquía ───────────────────────────────────────────────────
    section('5. Jerarquía (hierarchy_nodes por edificio)');

    let hierarchyRows;
    try {
      hierarchyRows = await run(
        client,
        'hierarchy_nodes per building',
        `SELECT building_id, COUNT(*)::int AS node_count
         FROM hierarchy_nodes
         GROUP BY building_id
         ORDER BY building_id`,
      );
      table(hierarchyRows, ['building_id', 'node_count']);
      if (hierarchyRows.length === 0) {
        console.log('  Ningún edificio tiene jerarquía definida.');
      }
    } catch (err) {
      console.log('  Error (¿tabla hierarchy_nodes existe?):', err.message);
    }

    // ─── 6. Resumen edificios ───────────────────────────────────────────
    section('6. Listado de edificios');

    const buildings = await run(
      client,
      'buildings',
      `SELECT b.id, b.name, (SELECT COUNT(*) FROM meters m WHERE m.building_id = b.id) AS meters_count
       FROM buildings b
       ORDER BY b.id`,
    );
    table(buildings, ['id', 'name', 'meters_count']);
  } finally {
    await client.end();
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Verificación completada.');
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  if (err?.code === 'ECONNREFUSED' || err?.code === 'ETIMEDOUT' || err?.message?.includes('connect')) {
    console.error('\nNo se pudo conectar a la base de datos.');
    console.error('  Revisa .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD) y que el túnel SSH esté abierto si aplica.\n');
  } else {
    console.error('Error:', err?.message || err);
  }
  process.exit(1);
});
