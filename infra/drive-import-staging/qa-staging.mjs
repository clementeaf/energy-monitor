import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const SOURCE_FILE = process.env.SOURCE_FILE || null;

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
    host: secret.host || secret.DB_HOST,
    port: Number(secret.port || secret.DB_PORT || 5432),
    database: secret.dbname || secret.database || secret.DB_NAME,
    user: secret.username || secret.user || secret.DB_USERNAME,
    password: secret.password || secret.DB_PASSWORD,
    ssl: getPgSslOptionsForRds(),
  };
}

async function fetchValue(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function main() {
  const dbSecret = await getSecretJson(DB_SECRET_NAME);
  const client = new Client(buildDbConfig(dbSecret));
  await client.connect();

  try {
    const filterSql = SOURCE_FILE ? 'WHERE source_file = $1' : '';
    const filterParams = SOURCE_FILE ? [SOURCE_FILE] : [];

    const [files, meters, duplicates, timestampRange, invalidModelPhase, invalidSinglePhase, nonMonotonicEnergy] = await Promise.all([
      fetchValue(
        client,
        `SELECT source_file, COUNT(*)::bigint AS row_count
         FROM readings_import_staging
         ${filterSql}
         GROUP BY source_file
         ORDER BY source_file`,
        filterParams,
      ),
      fetchValue(
        client,
        `SELECT meter_id, COUNT(*)::bigint AS row_count, MIN(timestamp) AS min_timestamp, MAX(timestamp) AS max_timestamp
         FROM readings_import_staging
         ${filterSql}
         GROUP BY meter_id
         ORDER BY meter_id`,
        filterParams,
      ),
      fetchValue(
        client,
        `SELECT source_file, meter_id, timestamp, COUNT(*)::bigint AS duplicate_count
         FROM readings_import_staging
         ${filterSql}
         GROUP BY source_file, meter_id, timestamp
         HAVING COUNT(*) > 1
         ORDER BY source_file, meter_id, timestamp
         LIMIT 20`,
        filterParams,
      ),
      fetchValue(
        client,
        `SELECT source_file, MIN(timestamp) AS min_timestamp, MAX(timestamp) AS max_timestamp
         FROM readings_import_staging
         ${filterSql}
         GROUP BY source_file
         ORDER BY source_file`,
        filterParams,
      ),
      fetchValue(
        client,
        `SELECT source_file, meter_id, model, phase_type, COUNT(*)::bigint AS row_count
         FROM readings_import_staging
         ${filterSql ? `${filterSql} AND` : 'WHERE'} (
           (model = 'PAC1670' AND phase_type <> '3P') OR
           (model = 'PAC1651' AND phase_type <> '1P')
         )
         GROUP BY source_file, meter_id, model, phase_type
         ORDER BY source_file, meter_id
         LIMIT 20`,
        filterParams,
      ),
      fetchValue(
        client,
        `SELECT source_file, meter_id, COUNT(*)::bigint AS row_count
         FROM readings_import_staging
         ${filterSql ? `${filterSql} AND` : 'WHERE'} phase_type = '1P'
           AND (voltage_l2 IS NOT NULL OR voltage_l3 IS NOT NULL OR current_l2 IS NOT NULL OR current_l3 IS NOT NULL)
         GROUP BY source_file, meter_id
         ORDER BY source_file, meter_id
         LIMIT 20`,
        filterParams,
      ),
      fetchValue(
        client,
        `WITH ordered AS (
           SELECT
             source_file,
             meter_id,
             timestamp,
             energy_kwh_total,
             LAG(energy_kwh_total) OVER (PARTITION BY source_file, meter_id ORDER BY timestamp) AS previous_energy
           FROM readings_import_staging
           ${filterSql}
         )
         SELECT source_file, meter_id, timestamp, energy_kwh_total, previous_energy
         FROM ordered
         WHERE previous_energy IS NOT NULL AND energy_kwh_total < previous_energy
         ORDER BY source_file, meter_id, timestamp
         LIMIT 20`,
        filterParams,
      ),
    ]);

    console.log(JSON.stringify({
      sourceFile: SOURCE_FILE,
      files,
      meters,
      timestampRange,
      duplicates,
      invalidModelPhase,
      invalidSinglePhase,
      nonMonotonicEnergy,
    }, null, 2));
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  console.error('[drive-import-staging:qa]', error);
  process.exit(1);
}