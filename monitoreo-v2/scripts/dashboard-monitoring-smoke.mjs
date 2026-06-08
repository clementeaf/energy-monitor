#!/usr/bin/env node
/**
 * HTTP smoke tests for Executive Dashboard + Monitoring API surface.
 * Mirrors frontend TanStack Query calls; fails on 4xx/5xx or malformed JSON.
 *
 * Usage:
 *   node scripts/dashboard-monitoring-smoke.mjs
 *   API_BASE=http://localhost:4000/api node scripts/dashboard-monitoring-smoke.mjs
 *   TENANT_ID=b0000002-0000-0000-0000-000000000001 node scripts/dashboard-monitoring-smoke.mjs
 */
import {
  API_BASE,
  TENANT_ID,
  assert,
  tally,
  obtainAccessToken,
  smokeGet,
  qs,
  dateRange,
} from './lib/smoke-http.mjs';

const isArray = (v) => Array.isArray(v);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Runs executive dashboard API smoke checks.
 * @param token - Bearer access token
 * @param ctx - Shared ids discovered from prior calls
 */
async function runExecutiveDashboard(token, ctx) {
  console.log('\nExecutive Dashboard (/dashboard/executive)\n');

  const week = dateRange(7);
  const day = dateRange(1);
  const month = dateRange(30);

  await smokeGet('GET /buildings', '/buildings', token, isArray);
  const buildingsRes = await smokeGet('GET /buildings (ids)', '/buildings', token, isArray);
  ctx.buildingId = buildingsRes.json?.[0]?.id ?? null;

  await smokeGet('GET /meters', '/meters', token, (d) => isArray(d) || (isObject(d) && isArray(d.data)));
  const metersRes = await smokeGet('GET /meters (ids)', '/meters', token, (d) =>
    isArray(d) ? true : isObject(d) && isArray(d.data),
  );
  const meters = Array.isArray(metersRes.json) ? metersRes.json : metersRes.json?.data ?? [];
  ctx.meterId = meters[0]?.id ?? null;

  await smokeGet('GET /readings/latest', '/readings/latest', token, isArray);

  await smokeGet(
    'GET /readings/aggregated portfolio daily',
    `/readings/aggregated?${qs({ ...week, interval: 'daily', groupBy: 'portfolio' })}`,
    token,
    isArray,
  );

  await smokeGet(
    'GET /readings/aggregated portfolio hourly',
    `/readings/aggregated?${qs({ ...day, interval: 'hourly', groupBy: 'portfolio' })}`,
    token,
    isArray,
  );

  await smokeGet(
    'GET /readings/aggregated portfolio monthly',
    `/readings/aggregated?${qs({ ...month, interval: 'monthly', groupBy: 'portfolio' })}`,
    token,
    isArray,
  );

  await smokeGet('GET /alerts?status=active', `/alerts?${qs({ status: 'active' })}`, token, isArray);

  const tariffsRes = await smokeGet('GET /tariffs', '/tariffs', token, isArray);
  const tariffId = tariffsRes.json?.[0]?.id ?? null;
  if (tariffId) {
    await smokeGet(
      `GET /tariffs/${tariffId}/blocks`,
      `/tariffs/${tariffId}/blocks`,
      token,
      isArray,
    );
  } else {
    assert('GET /tariffs/:id/blocks (skipped — no tariffs)', true);
  }
}

/**
 * Runs compare dashboard API smoke checks.
 * @param token - Bearer access token
 */
async function runCompareDashboard(token) {
  console.log('\nCompare Dashboard (/dashboard/compare)\n');

  for (const days of [1, 7, 30]) {
    await smokeGet(
      `GET /readings/compare-buildings days=${days}`,
      `/readings/compare-buildings?${qs({ days })}`,
      token,
      (d) =>
        isObject(d)
        && isArray(d.current)
        && isArray(d.previous)
        && typeof d.from === 'string'
        && typeof d.to === 'string',
    );
  }
}

/**
 * Runs platform dashboard smoke checks (super_admin).
 * @param token - Bearer access token
 */
async function runPlatformDashboard(token) {
  console.log('\nPlatform Dashboard (/dashboard/platform)\n');

  await smokeGet(
    'GET /platform-dashboard/kpis',
    '/platform-dashboard/kpis',
    token,
    isObject,
    { skipTenant: true },
  );
}

/**
 * Runs monitoring module API smoke checks.
 * @param token - Bearer access token
 * @param ctx - Shared ids (buildingId, meterId)
 */
async function runMonitoring(token, ctx) {
  console.log('\nMonitoring (/monitoring/*)\n');

  const week = dateRange(7);
  const { buildingId, meterId } = ctx;

  await smokeGet('GET /readings/latest (realtime)', '/readings/latest', token, isArray);

  if (buildingId) {
    await smokeGet(
      'GET /meters?buildingId',
      `/meters?${qs({ buildingId })}`,
      token,
      (d) => isArray(d) || (isObject(d) && isArray(d.data)),
    );

    await smokeGet(
      'GET /readings/latest?buildingId',
      `/readings/latest?${qs({ buildingId })}`,
      token,
      isArray,
    );

    await smokeGet(
      'GET /readings/aggregated daily building',
      `/readings/aggregated?${qs({
        from: week.from,
        to: week.to,
        interval: 'daily',
        buildingId,
      })}`,
      token,
      isArray,
    );

    await smokeGet(
      'GET /alerts?status=active&buildingId',
      `/alerts?${qs({ status: 'active', buildingId })}`,
      token,
      isArray,
    );

    await smokeGet(
      'GET /hierarchy/buildings/:id',
      `/hierarchy/buildings/${buildingId}`,
      token,
      isArray,
    );

    await smokeGet(
      'GET /concentrators?buildingId',
      `/concentrators?${qs({ buildingId })}`,
      token,
      isArray,
    );
  } else {
    assert('scoped monitoring (skipped — no buildings)', true);
  }

  await smokeGet('GET /concentrators', '/concentrators', token, isArray);

  if (meterId) {
    await smokeGet('GET /meters/:id', `/meters/${meterId}`, token, isObject);

    await smokeGet(
      'GET /readings timeseries 1h',
      `/readings?${qs({
        meterId,
        from: week.from,
        to: week.to,
        resolution: '1h',
      })}`,
      token,
      isArray,
    );

    await smokeGet(
      'GET /readings/aggregated 15min CAGG (>7d)',
      `/readings/aggregated?${qs({
        from: week.from,
        to: week.to,
        interval: '15min',
        meterId,
      })}`,
      token,
      isArray,
    );

    await smokeGet(
      'GET /fault-events',
      `/fault-events?${qs({ meterId })}`,
      token,
      isArray,
    );

    await smokeGet(
      'GET /alerts?meterId',
      `/alerts?${qs({ meterId })}`,
      token,
      isArray,
    );
  } else {
    assert('meter-scoped monitoring (skipped — no meters)', true);
  }

  await smokeGet(
    'GET /readings/aggregated generation path',
    `/readings/aggregated?${qs({ ...week, interval: 'daily' })}`,
    token,
    isArray,
  );
}

/**
 * Runs the full dashboard + monitoring smoke battery.
 */
async function main() {
  console.log(`\nDashboard + Monitoring smoke — ${API_BASE}`);
  if (TENANT_ID) console.log(`x-tenant-id: ${TENANT_ID}`);

  const token = await obtainAccessToken();
  assert('obtain access token via MFA', typeof token === 'string' && token.length > 50);

  const ctx = { buildingId: null, meterId: null };

  await runExecutiveDashboard(token, ctx);
  await runCompareDashboard(token);
  await runPlatformDashboard(token);
  await runMonitoring(token, ctx);

  const { passed, failed } = tally();
  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
