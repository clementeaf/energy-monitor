#!/usr/bin/env node
/**
 * Vacía readings_import_staging para liberar espacio.
 * Solo si los datos ya están en readings / tiendas / analisis y no necesitas staging como histórico.
 *
 * Uso: DB_HOST=127.0.0.1 DB_PORT=5433 PURGE_STAGING=1 node purge-staging.mjs
 * Sin PURGE_STAGING=1 solo muestra tamaños y no borra.
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import pg from 'pg';

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const CONFIRM = process.env.PURGE_STAGING === '1';

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

async function main() {
  const secret = await getSecretJson(DB_SECRET_NAME);
  const client = new pg.Client(buildDbConfig(secret));
  await client.connect();

  const count = await client.query('SELECT COUNT(*)::bigint AS n FROM readings_import_staging');
  const n = Number(count.rows[0].n);
  const size = await client.query(
    "SELECT pg_total_relation_size('readings_import_staging')::bigint AS bytes"
  );
  const bytes = Number(size.rows[0].bytes);
  const gb = (bytes / 1e9).toFixed(2);

  console.log(`readings_import_staging: ${n.toLocaleString('es-CL')} filas, ~${gb} GB`);

  if (!CONFIRM) {
    console.log('\nPara vaciar (TRUNCATE), ejecuta con: PURGE_STAGING=1');
    await client.end();
    return;
  }

  console.log('Ejecutando TRUNCATE readings_import_staging...');
  await client.query('TRUNCATE readings_import_staging');
  console.log('Listo. Staging vacío; espacio liberado tras el próximo VACUUM.');
  await client.query('VACUUM ANALYZE readings_import_staging');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
