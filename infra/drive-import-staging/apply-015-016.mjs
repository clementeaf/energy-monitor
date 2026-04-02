#!/usr/bin/env node
/**
 * Aplica migraciones 015 (tiendas) y 016 (analisis) contra RDS.
 * Uso: DB_HOST=127.0.0.1 DB_PORT=5433 node apply-015-016.mjs (desde este dir)
 */

import { readFileSync } from 'fs';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
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
    ssl: getPgSslOptionsForRds(),
  };
}

const sqlDir = join(__dirname, '..', '..', 'sql');

async function main() {
  const secret = await getSecretJson(DB_SECRET_NAME);
  const client = new pg.Client(buildDbConfig(secret));
  await client.connect();

  for (const name of ['015_tiendas.sql', '016_analisis.sql']) {
    const sql = readFileSync(join(sqlDir, name), 'utf8');
    console.log(`Applying ${name}...`);
    await client.query(sql);
    console.log(`${name} OK`);
  }

  await client.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
