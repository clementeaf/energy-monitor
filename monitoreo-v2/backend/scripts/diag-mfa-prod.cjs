#!/usr/bin/env node
/** Diagnose MFA decrypt + TOTP (ECS Exec, cwd /app). */
const pg = require('pg');
const fs = require('fs');
const { createDecipheriv, scryptSync } = require('crypto');
const { verifySync, generateSync } = require('otplib');

const userId = process.argv[2] || 'd141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f';

function decryptPii(value) {
  if (!value || !value.startsWith('pii:')) return value;
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) return value;
  const key = scryptSync(raw, 'em-pii-v1', 32);
  const parts = value.split(':');
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const ciphertext = Buffer.from(parts[3], 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
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
  const { rows } = await client.query(
    'SELECT id, mfa_enabled, mfa_secret FROM users WHERE id = $1',
    [userId],
  );
  if (rows.length === 0) {
    console.log(JSON.stringify({ error: 'user_not_found', userId }));
    process.exit(1);
  }
  const enc = rows[0].mfa_secret;
  const result = {
    userId,
    mfa_enabled: rows[0].mfa_enabled,
    encryptionKeySet: Boolean(process.env.CONFIG_ENCRYPTION_KEY),
    secretEncrypted: typeof enc === 'string' && enc.startsWith('pii:'),
  };
  try {
    const decrypted = decryptPii(enc);
    const code = generateSync({ secret: decrypted });
    result.generatedCode = code;
    result.selfVerify = verifySync({
      token: code,
      secret: decrypted,
      epochTolerance: 1,
    }).valid;
    result.secretLength = decrypted.length;
  } catch (err) {
    result.decryptError = err instanceof Error ? err.message : String(err);
  }
  console.log(JSON.stringify(result, null, 2));
  await client.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
