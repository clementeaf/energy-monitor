import pg from 'pg';

/**
 * Build PostgreSQL client config from environment variables.
 * @returns {import('pg').ClientConfig}
 */
export function buildDbConfig() {
  const sslEnabled = process.env.DB_SSL === 'true';
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5434),
    database: process.env.DB_NAME ?? 'monitoreo_v2',
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'monitoreo2026',
    ssl: sslEnabled ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
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
