#!/usr/bin/env node
/**
 * Aplica migración 017 (módulo BILLING_OVERVIEW y permisos view para roles 1,2,3).
 * Necesario para que GET /billing/* deje de devolver 403.
 * Uso: node apply-017-billing.mjs
 *      Con túnel local: DB_HOST=127.0.0.1 DB_PORT=5433 node apply-017-billing.mjs
 */

import { readFileSync } from 'fs';
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
    ssl: { rejectUnauthorized: false },
  };
}

const sqlPath = join(__dirname, '..', '..', 'sql', '017_billing.sql');

function configFromEnv() {
  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME || process.env.DATABASE_NAME;
  const user = process.env.DB_USERNAME || process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (host && database && user && password) {
    return {
      host,
      port: Number(process.env.DB_PORT || 5432),
      database,
      user,
      password,
      ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    };
  }
  return null;
}

async function main() {
  let config = configFromEnv();
  if (!config) {
    const secret = await getSecretJson(DB_SECRET_NAME);
    config = buildDbConfig(secret);
  }
  const client = new pg.Client(config);
  await client.connect();
  try {
    const sql = readFileSync(sqlPath, 'utf8');
    console.log('Applying sql/017_billing.sql...');
    await client.query(sql);
    console.log('017_billing.sql OK');
  } finally {
    await client.end();
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
