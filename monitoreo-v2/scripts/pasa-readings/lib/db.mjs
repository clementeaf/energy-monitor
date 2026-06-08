import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const requirePg = fs.existsSync('/app/package.json')
  ? createRequire('/app/package.json')
  : createRequire(fileURLToPath(import.meta.url));

const pg = requirePg('pg');

/**
 * Build PostgreSQL client config from environment variables.
 * @returns {import('pg').ClientConfig}
 */
export function buildDbConfig() {
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const isLocal = host === '127.0.0.1' || host === 'localhost';
  const sslEnabled = process.env.DB_SSL === 'true' || !isLocal;
  const caPath = process.env.RDS_CA_BUNDLE_PATH ?? '/app/certs/rds-global-bundle.pem';
  let ssl;
  if (sslEnabled) {
    ssl = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ...(!isLocal && fs.existsSync(caPath) ? { ca: fs.readFileSync(caPath) } : {}),
    };
  }
  return {
    host,
    port: Number(process.env.DB_PORT ?? (isLocal ? 5434 : 5432)),
    database: process.env.DB_NAME ?? 'monitoreo_v2',
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'monitoreo2026',
    ssl,
  };
}

/**
 * Connect to monitoreo_v2 PostgreSQL.
 * @returns {Promise<import('pg').Client>}
 */
export async function connectDb() {
  const client = new pg.Client(buildDbConfig());
  await client.connect();
  return client;
}

/**
 * Load PASA buildings keyed by code (MG, MM, OT, SC52, SC53).
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - PASA tenant UUID
 * @returns {Promise<Map<string, { id: string; code: string; name: string }>>}
 */
export async function loadBuildingMap(client, tenantId) {
  const { rows } = await client.query(
    `SELECT id, code, name FROM buildings WHERE tenant_id = $1`,
    [tenantId],
  );
  const map = new Map();
  for (const row of rows) {
    map.set(row.code, { id: row.id, code: row.code, name: row.name });
  }
  return map;
}
