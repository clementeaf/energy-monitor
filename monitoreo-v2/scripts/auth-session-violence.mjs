#!/usr/bin/env node
/**
 * HTTP smoke / violence tests against local auth session stack.
 * Requires: backend :4000 or Vite proxy :5173, seed user with MFA.
 *
 * Usage:
 *   node scripts/auth-session-violence.mjs
 *   MFA_CODE=123456 API_BASE=http://localhost:5173/api node scripts/auth-session-violence.mjs
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendDir = join(scriptDir, '..', 'backend');

const API_BASE = process.env.API_BASE ?? 'http://localhost:5173/api';
const USER_ID = process.env.USER_ID ?? 'd141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f';
const MFA_SECRET = process.env.MFA_SECRET ?? 'XDBX7HTXVENGAFU5EU3XLMVTJ5TBNPKG';

const STALE_COOKIE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4IiwiZW1haWwiOiJhQGIuY29tIiwidGVuYW50SWQiOiJ0Iiwicm9sZUlkIjoiciIsInJvbGVTbHVnIjoiYSIsInBlcm1pc3Npb25zIjpbXSwiaWF0IjoxLCJleHAiOjJ9.x';

let passed = 0;
let failed = 0;

/**
 * Records pass/fail for a single violence check.
 */
function assert(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
    return;
  }
  failed += 1;
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

/**
 * Performs fetch with optional cookie and bearer headers.
 */
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
    credentials: 'include',
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, headers: res.headers };
}

/**
 * Runs the full violent auth session battery.
 */
async function main() {
  console.log(`\nAuth session violence — ${API_BASE}\n`);

  const clear = await apiFetch('/auth/clear-session', { method: 'POST' });
  assert('POST /auth/clear-session → 200', clear.status === 200);

  const meAnon = await apiFetch('/auth/me');
  assert('GET /auth/me anonymous → 401', meAnon.status === 401);

  const code =
    process.env.MFA_CODE ??
    execSync(
      `node -e "const {generateSync}=require('otplib'); console.log(generateSync({secret:process.env.MFA_SECRET}));"`,
      { cwd: backendDir, env: { ...process.env, MFA_SECRET } },
    )
      .toString()
      .trim();
  const mfa = await apiFetch('/auth/mfa/validate', {
    method: 'POST',
    body: JSON.stringify({ userId: USER_ID, code }),
  });
  assert('POST /auth/mfa/validate → 200', mfa.status === 200);
  const accessToken = mfa.json?.accessToken ?? '';
  assert('mfa/validate returns accessToken in dev', typeof accessToken === 'string' && accessToken.length > 100);

  const meBearer = await apiFetch('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assert('GET /auth/me with Bearer → 200', meBearer.status === 200);

  const privacyBearer = await apiFetch('/auth/accept-privacy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assert('POST /auth/accept-privacy with Bearer → 200', privacyBearer.status === 200);

  const stalePlusBearer = await apiFetch('/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Cookie: `access_token=${STALE_COOKIE_JWT}`,
    },
  });
  assert(
    'stale cookie + valid Bearer → 200 (Bearer must win)',
    stalePlusBearer.status === 200,
    `got ${stalePlusBearer.status}`,
  );

  const staleOnly = await apiFetch('/auth/me', {
    headers: { Cookie: `access_token=${STALE_COOKIE_JWT}` },
  });
  assert('stale cookie only → 401', staleOnly.status === 401);

  const badMfa = await apiFetch('/auth/mfa/validate', {
    method: 'POST',
    body: JSON.stringify({ userId: USER_ID, code: '000000' }),
  });
  assert('invalid MFA code → 401', badMfa.status === 401);

  const flood = await Promise.all(
    Array.from({ length: 8 }, () =>
      apiFetch('/auth/mfa/validate', {
        method: 'POST',
        body: JSON.stringify({ userId: USER_ID, code: '000000' }),
      }),
    ),
  );
  const throttled = flood.some((r) => r.status === 429);
  assert('MFA flood triggers throttle (429) or 401', throttled || flood.every((r) => r.status === 401));

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
