/**
 * Aplica migraciones de auth: 011_sessions.sql y 012_seed_test_user_and_session.sql.
 * Usa DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD (o .env en backend/).
 * Ejecutar desde repo root: node backend/scripts/run-auth-migrations.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const sqlDir = join(repoRoot, 'sql');

async function loadEnv() {
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: join(__dirname, '..', '.env') });
  } catch {
    // sin dotenv, usar solo process.env
  }
}

async function main() {
  await loadEnv();

  const host = process.env.DB_HOST;
  const user = process.env.DB_USERNAME || process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'energy_monitor';
  const port = Number(process.env.DB_PORT || 5432);

  if (!host || !user || !password) {
    console.error('Faltan DB_HOST, DB_USERNAME y DB_PASSWORD (o .env en backend/)');
    process.exit(1);
  }

  const client = new pg.Client({
    host,
    port,
    database,
    user,
    password,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 8000,
  });

  try {
    await client.connect();
    console.log('Conectado a', database, 'en', host + ':' + port);

    const files = ['011_sessions.sql', '012_seed_test_user_and_session.sql'];
    for (const file of files) {
      const path = join(sqlDir, file);
      const sql = readFileSync(path, 'utf8');
      console.log('Aplicando', file, '...');
      await client.query(sql);
      console.log('  OK');
    }

    console.log('Migraciones de auth aplicadas.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
