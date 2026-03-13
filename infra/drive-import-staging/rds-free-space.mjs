#!/usr/bin/env node
/**
 * Libera espacio en RDS vía SQL: muestra tamaños y ejecuta VACUUM.
 * Uso: DB_HOST=127.0.0.1 DB_PORT=5433 node rds-free-space.mjs
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';

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

function fmt(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
  return bytes + ' B';
}

async function main() {
  const secret = await getSecretJson(DB_SECRET_NAME);
  const client = new pg.Client(buildDbConfig(secret));
  await client.connect();

  console.log('--- Tamaño por tabla (ordenado por total) ---');
  const sizes = await client.query(`
    SELECT
      schemaname,
      relname AS table_name,
      pg_total_relation_size(schemaname || '.' || relname) AS total_bytes,
      pg_relation_size(schemaname || '.' || relname) AS table_bytes,
      pg_indexes_size(schemaname || '.' || relname) AS index_bytes
    FROM pg_catalog.pg_statio_user_tables
    ORDER BY pg_total_relation_size(schemaname || '.' || relname) DESC
  `);
  for (const r of sizes.rows) {
    console.log(`${r.table_name.padEnd(35)} total: ${fmt(Number(r.total_bytes)).padStart(12)}  table: ${fmt(Number(r.table_bytes))}  indexes: ${fmt(Number(r.index_bytes))}`);
  }

  console.log('\n--- VACUUM (reclama espacio interno, sin bloqueo prolongado) ---');
  const vacuumTables = ['readings_import_staging', 'readings', 'analisis', 'tiendas', 'alerts'];
  for (const table of vacuumTables) {
    try {
      console.log(`VACUUM ANALYZE ${table}...`);
      await client.query(`VACUUM ANALYZE ${table}`);
      console.log(`  ${table} OK`);
    } catch (err) {
      console.log(`  ${table} error:`, err.message);
    }
  }

  console.log('\n--- VACUUM pg_catalog (temp / buffers) ---');
  try {
    await client.query('VACUUM (ANALYZE)');
    console.log('VACUUM general OK');
  } catch (err) {
    console.log('VACUUM general:', err.message);
  }

  await client.end();
  console.log('\nListo. Si sigue sin espacio: aumentar volumen de RDS en AWS (Storage autoscaling o Modify).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
