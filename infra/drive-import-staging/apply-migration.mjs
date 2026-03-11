import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const SQL_PATH = resolve(__dirname, '../../sql/010_readings_import_staging.sql');

async function getSecretJson(secretId) {
  const secretsClient = new SecretsManagerClient({ region: REGION });
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) {
    throw new Error(`Secret ${secretId} does not contain SecretString`);
  }

  return JSON.parse(response.SecretString);
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

async function main() {
  const [dbSecret, sql] = await Promise.all([
    getSecretJson(DB_SECRET_NAME),
    readFile(SQL_PATH, 'utf8'),
  ]);

  const client = new Client(buildDbConfig(dbSecret));
  await client.connect();

  try {
    await client.query(sql);
    console.log('Applied sql/010_readings_import_staging.sql');
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  console.error('[drive-import-staging:migrate]', error);
  process.exit(1);
}