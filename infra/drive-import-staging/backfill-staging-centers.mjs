/**
 * Rellena staging_centers desde readings_import_staging (GROUP BY center).
 * Útil cuando staging_centers existe pero está vacía (p. ej. migración 014 aplicada después del import).
 *
 * Uso: npm run backfill-staging-centers
 * Env: DB_SECRET_NAME, DB_HOST, DB_PORT igual que promote; DRY_RUN=true para solo inspeccionar.
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const DRY_RUN = process.env.DRY_RUN === 'true';

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
    ssl: getPgSslOptionsForRds(),
  };
}

const MIGRATION_014 = `
CREATE TABLE IF NOT EXISTS staging_centers (
  id             VARCHAR(100) PRIMARY KEY,
  center_name    TEXT         NOT NULL,
  center_type    TEXT         NOT NULL,
  meters_count   INTEGER      NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
`;

async function main() {
  const secret = await getSecretJson(DB_SECRET_NAME);
  const client = new Client(buildDbConfig(secret));
  await client.connect();

  console.log('Aplicando migración 014 (CREATE TABLE IF NOT EXISTS staging_centers)...');
  await client.query(MIGRATION_014);
  console.log('Tabla staging_centers lista.');

  const { rows } = await client.query(`
    SELECT center_name, center_type, COUNT(DISTINCT meter_id)::int AS meters_count
    FROM readings_import_staging
    GROUP BY center_name, center_type
    ORDER BY center_name
  `);

  console.log(`Centros en staging: ${rows.length}`);
  if (rows.length === 0) {
    await client.end();
    console.log('Nada que escribir en staging_centers.');
    return;
  }

  if (DRY_RUN) {
    console.table(rows.map((r) => ({ id: slugify(r.center_name), ...r })));
    await client.end();
    console.log('DRY_RUN: no se escribió en staging_centers.');
    return;
  }

  try {
    await client.query('TRUNCATE staging_centers');
    for (const r of rows) {
      const id = slugify(r.center_name);
      await client.query(
        `INSERT INTO staging_centers (id, center_name, center_type, meters_count, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET center_name = EXCLUDED.center_name, center_type = EXCLUDED.center_type, meters_count = EXCLUDED.meters_count, updated_at = NOW()`,
        [id, r.center_name, r.center_type || '', r.meters_count],
      );
    }
    console.log(`staging_centers actualizado: ${rows.length} fila(s).`);
  } catch (err) {
    console.error('Error (¿migración 014 aplicada?):', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
