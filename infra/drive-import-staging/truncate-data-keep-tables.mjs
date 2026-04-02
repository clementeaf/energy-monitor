#!/usr/bin/env node
/**
 * Vacía la data de las tablas de negocio; mantiene tablas y datos de auth/roles.
 * Orden respeta FKs. No toca: users, roles, modules, actions, role_permissions, user_sites.
 *
 * Uso: DB_HOST=127.0.0.1 DB_PORT=5433 CONFIRM=1 node truncate-data-keep-tables.mjs
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import pg from 'pg';

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const CONFIRM = process.env.CONFIRM === '1';

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

const TRUNCATE_ORDER = [
  'readings_import_staging',
  'readings',
  'analisis',
  'alerts',
  'hierarchy_nodes',
  'tiendas',
  'meters',
  'buildings',
  'staging_centers',
  'sessions',
];

async function main() {
  const secret = await getSecretJson(DB_SECRET_NAME);
  const client = new pg.Client(buildDbConfig(secret));
  await client.connect();

  if (!CONFIRM) {
    console.log('Tablas que se vaciarían (orden):', TRUNCATE_ORDER.join(', '));
    console.log('\nNo se tocan: users, roles, modules, actions, role_permissions, user_sites.');
    console.log('Para ejecutar: CONFIRM=1');
    await client.end();
    return;
  }

  console.log('Truncando (orden por FK)...');
  for (const table of TRUNCATE_ORDER) {
    try {
      await client.query(`TRUNCATE TABLE ${table} CASCADE`);
      console.log(`  ${table} OK`);
    } catch (err) {
      console.log(`  ${table} error:`, err.message);
    }
  }

  console.log('Listo. Data eliminada; tablas y auth/roles intactos.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
