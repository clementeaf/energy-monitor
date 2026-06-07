#!/usr/bin/env node
/**
 * Apply one idempotent monitoreo-v2 migration from database/migrations/.
 *
 *   DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=monitoreo_v2 \
 *   DB_USERNAME=monitoreo_v2 DB_PASSWORD=monitoreo2026 \
 *   npm run db:migrate -- 41-user-import-prereq
 *
 * AWS RDS: same env vars + DB_SSL=true (or use psql -f on the .sql file).
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', '..', 'database', 'migrations');

/**
 * Resolve migration file name from CLI arg (with or without .sql).
 * @param {string | undefined} arg - CLI migration id
 * @returns {string} Filename ending in .sql
 */
function resolveMigrationFile(arg) {
  if (!arg || arg.startsWith('-')) {
    throw new Error('Usage: apply-migration.mjs <migration-id>  e.g. 41-user-import-prereq');
  }
  return arg.endsWith('.sql') ? arg : `${arg}.sql`;
}

/**
 * Build PostgreSQL client config from environment variables.
 * @returns {import('pg').ClientConfig}
 */
function buildDbConfig() {
  const sslEnabled = process.env.DB_SSL === 'true';
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'monitoreo_v2',
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    ssl: sslEnabled ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
  };
}

async function main() {
  const fileName = resolveMigrationFile(process.argv[2]);
  const filePath = join(MIGRATIONS_DIR, fileName);
  const sql = readFileSync(filePath, 'utf8');
  const config = buildDbConfig();
  const client = new pg.Client(config);

  console.log(`Connecting to ${config.host}:${config.port}/${config.database}...`);
  await client.connect();
  console.log(`Applying ${fileName}...`);
  await client.query(sql);

  const versionKey = fileName.replace(/\.sql$/, '');
  const check = await client.query(
    `SELECT version, applied_at FROM schema_migrations WHERE version = $1`,
    [versionKey],
  );
  await client.end();

  if (check.rows.length > 0) {
    console.log(`OK — schema_migrations.${versionKey} @ ${check.rows[0].applied_at}`);
  } else {
    console.log(`OK — ${fileName} applied (no schema_migrations row; check migration SQL)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
