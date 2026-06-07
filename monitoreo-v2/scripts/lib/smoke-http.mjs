#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

export const API_BASE = process.env.API_BASE ?? 'http://localhost:5173/api';
export const USER_ID = process.env.USER_ID ?? 'd141ad74-9d5d-4a5c-81ea-2bfa7d97ce6f';
export const MFA_SECRET = process.env.MFA_SECRET ?? 'XDBX7HTXVENGAFU5EU3XLMVTJ5TBNPKG';
export const TENANT_ID = process.env.TENANT_ID ?? '';
export const BACKEND_DIR = join(scriptDir, '..', '..', 'backend');

let passed = 0;
let failed = 0;

/**
 * Records pass/fail for a single smoke check.
 * @param name - Check label
 * @param ok - Whether the assertion passed
 * @param detail - Optional failure detail
 */
export function assert(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
    return;
  }
  failed += 1;
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

/**
 * Returns current pass/fail counts.
 * @returns Smoke test tally
 */
export function tally() {
  return { passed, failed };
}

/**
 * Performs fetch against API_BASE with JSON defaults.
 * @param path - API path (with leading slash)
 * @param options - Fetch options
 * @returns Status, parsed JSON, and headers
 */
export async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  if (TENANT_ID) {
    headers['x-tenant-id'] = TENANT_ID;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
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
 * Builds query string from flat params (skips null/undefined/empty).
 * @param params - Query parameters
 * @returns Encoded query string without leading ?
 */
export function qs(params) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  );
  return new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

/**
 * Returns ISO from/to for a relative day window ending now.
 * @param days - Number of days back from now
 * @returns from and to ISO strings
 */
export function dateRange(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Generates current TOTP code from MFA_SECRET via otplib in backend node_modules.
 * @returns Six-digit MFA code
 */
export function generateMfaCode() {
  if (process.env.MFA_CODE) return process.env.MFA_CODE.trim();
  return execSync(
    `node -e "const {generateSync}=require('otplib'); console.log(generateSync({secret:process.env.MFA_SECRET}));"`,
    { cwd: BACKEND_DIR, env: { ...process.env, MFA_SECRET } },
  )
    .toString()
    .trim();
}

/**
 * Obtains a dev access token via MFA validate (seed super_admin).
 * @returns Bearer access token
 */
export async function obtainAccessToken() {
  await apiFetch('/auth/clear-session', { method: 'POST' });
  const code = generateMfaCode();
  const mfa = await apiFetch('/auth/mfa/validate', {
    method: 'POST',
    body: JSON.stringify({ userId: USER_ID, code }),
  });
  if (mfa.status !== 200 || !mfa.json?.accessToken) {
    throw new Error(`MFA validate failed: HTTP ${mfa.status}`);
  }
  await apiFetch('/auth/accept-privacy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mfa.json.accessToken}` },
  });
  return mfa.json.accessToken;
}

/**
 * GET smoke check expecting 2xx and optional JSON validator.
 * @param name - Check label
 * @param path - API path
 * @param token - Bearer token
 * @param validate - Optional response validator
 * @returns Fetch result
 */
export async function smokeGet(name, path, token, validate) {
  const res = await apiFetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const okStatus = res.status >= 200 && res.status < 300;
  const okBody = validate ? validate(res.json) : true;
  assert(name, okStatus && okBody, okStatus ? 'invalid response shape' : `HTTP ${res.status}`);
  return res;
}
