#!/usr/bin/env node
/**
 * GAP-049: One-shot idempotent backfill — set quality='unknown' on legacy readings rows.
 * Usage: DB_HOST=127.0.0.1 DB_PORT=5434 DB_NAME=arauco DB_USERNAME=postgres DB_PASSWORD=arauco node monitoreo-v2/database/scripts/backfill-reading-quality.mjs
 */

import pg from 'pg';

function buildConfig() {
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'arauco',
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

async function main() {
  const client = new pg.Client(buildConfig());
  await client.connect();

  const { rowCount } = await client.query(
    `UPDATE readings SET quality = 'unknown'::reading_quality WHERE quality IS NULL`,
  );

  console.log(`Backfill complete: ${rowCount ?? 0} rows updated (quality → unknown)`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
