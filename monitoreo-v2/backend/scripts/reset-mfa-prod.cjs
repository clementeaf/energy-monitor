#!/usr/bin/env node
/** Reset MFA enrollment for a user (ECS Exec, cwd /app). */
const pg = require('pg');
const fs = require('fs');

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node reset-mfa-prod.cjs <userId>');
  process.exit(1);
}

(async () => {
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync('/app/certs/rds-global-bundle.pem'),
    },
  });
  await client.connect();
  const before = await client.query(
    'SELECT id, mfa_enabled, mfa_secret IS NOT NULL AS has_secret FROM users WHERE id = $1',
    [userId],
  );
  if (before.rows.length === 0) {
    console.log(JSON.stringify({ error: 'user_not_found', userId }));
    process.exit(1);
  }
  await client.query(
    `UPDATE users SET mfa_secret = NULL, mfa_enabled = false, mfa_recovery_codes = NULL WHERE id = $1`,
    [userId],
  );
  const after = await client.query(
    'SELECT id, mfa_enabled, mfa_secret IS NOT NULL AS has_secret FROM users WHERE id = $1',
    [userId],
  );
  console.log(JSON.stringify({ reset: true, before: before.rows[0], after: after.rows[0] }, null, 2));
  await client.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
