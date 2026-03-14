#!/usr/bin/env node
/**
 * Prueba todas las APIs con un Bearer token.
 * Uso: node scripts/test-all-apis.mjs [BASE_URL]
 * Token por defecto: variable de entorno BEARER_TOKEN o el hardcodeado abajo.
 */

const BASE = process.argv[2] || process.env.API_BASE_URL || 'https://energymonitor.click/api';
const TOKEN =
  process.env.BEARER_TOKEN ||
  'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjUzMDcyNGQ0OTE3M2EzZWQ2YjRhMDBhYTYzNDQyMDMwMGQ3MmFlNWIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI0MjA4NTI0MDExNTktaXY4dHJ1ZGFlM3A3N2NiZ2NnYWdjMHBibGxrYmNhZzQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI0MjA4NTI0MDExNTktaXY4dHJ1ZGFlM3A3N2NiZ2NnYWdjMHBibGxrYmNhZzQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTAwNDYyNjk0NjAxNDUyMzE3NjQiLCJlbWFpbCI6ImNhcnJpYWdhZGFmYWxjb25lQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJub25jZSI6IjI4YzMxYmFlLWYzYjMtNDcwNi04ZTg5LWM4MGQ5MjcwYWJhZiIsIm5iZiI6MTc3MzM1Nzc3MCwibmFtZSI6ImNsZW1lbnRlIGFycmlhZ2FkYSBmYWxjb25lIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0s5aG10ZVE3aUhZOGJQOWVYeE1ZYVZDQmF2RTk0UmxqaDJPSWxUTHpEd2pJVV9Ndz1zOTYtYyIsImdpdmVuX25hbWUiOiJjbGVtZW50ZSIsImZhbWlseV9uYW1lIjoiYXJyaWFnYWRhIGZhbGNvbmUiLCJpYXQiOjE3NzMzNTgwNzAsImV4cCI6MTc3MzM2MTY3MCwianRpIjoiM2RhMWUwYzg0ZmMyZjEyZDVlYzA2OGE3NjU1YjE3MWMwYmUwNTg2NyJ9.dPyQG7WKYidh9YD-exgLjwdsyeAa79Z2ynsfZCXVoCbwHp4sbdhVHAtKDN-wc-DuC4fTJwl5XhrSnuOgzL_fxCG-G1J1fQvAvjhbXT_rCqfDaqfpwI-TR_hYEC9G8pA-wwcHAJFfiuovcARQyu5cLwzy2dZb3R2cow6MJBy27d8st4CihyXW2sq8BY6zb5S9Q8tUoJeQYiYZiEIJlaiWsG--ijFdWhbOO9-zBzTMROck6spUT7W1W2NcF8_n1dx58oXC7J2W6hsI3snFPN0oekmu8vvXnotqprlG0LoWygozsfO04XLnHQ7W5QJWUav8oMHkw_6TOKWaXKEtczaWYw';

const headers = {
  Authorization: TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

const to = new Date().toISOString().slice(0, 10);
const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const REQUEST_TIMEOUT_MS = 35000;

async function request(method, path, body = undefined) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      signal: ac.signal,
      headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    clearTimeout(to);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_) {}
    return { status: res.status, ok: res.ok, text, json };
  } catch (err) {
    clearTimeout(to);
    return { status: 0, ok: false, text: err.message || 'timeout/network', json: null };
  }
}

function ok(status) {
  return status >= 200 && status < 300;
}

function summary(res) {
  if (res.json && typeof res.json === 'object') {
    if (Array.isArray(res.json)) return `[${res.json.length} items]`;
    if (res.json.message) return res.json.message;
    if (res.json.error) return res.json.error;
  }
  return res.text.slice(0, 60) + (res.text.length > 60 ? '...' : '');
}

async function run() {
  const results = [];
  let buildingId, meterId, alertId;

  const test = async (method, path, body) => {
    const res = await request(method, path, body);
    results.push({ method, path, status: res.status, summary: summary(res) });
    return res;
  };

  console.log('Base URL:', BASE);
  console.log('---');

  await test('GET', '/auth/me');
  await test('GET', '/auth/permissions');

  const buildingsRes = await test('GET', '/buildings');
  if (buildingsRes.json && Array.isArray(buildingsRes.json) && buildingsRes.json.length > 0) {
    buildingId = buildingsRes.json[0].id;
  }

  if (buildingId) {
    await test('GET', `/buildings/${buildingId}`);
    await test('GET', `/buildings/${buildingId}/meters`);
    await test('GET', `/buildings/${buildingId}/consumption?from=${from}&to=${to}&resolution=hourly`);
  } else {
    results.push({ method: 'GET', path: '/buildings/:id (skip)', status: '-', summary: 'no building id' });
    results.push({ method: 'GET', path: '/buildings/:id/meters (skip)', status: '-', summary: '-' });
    results.push({ method: 'GET', path: '/buildings/:id/consumption (skip)', status: '-', summary: '-' });
  }

  const overviewRes = await test('GET', '/meters/overview');
  if (overviewRes.json && Array.isArray(overviewRes.json) && overviewRes.json.length > 0) {
    meterId = overviewRes.json[0].id;
  }

  if (meterId) {
    await test('GET', `/meters/${meterId}`);
    await test('GET', `/meters/${meterId}/readings?from=${from}&to=${to}&resolution=hourly`);
    await test('GET', `/meters/${meterId}/uptime?period=weekly`);
    await test('GET', `/meters/${meterId}/downtime-events?from=${from}&to=${to}`);
    await test('GET', `/meters/${meterId}/alarm-events?from=${from}&to=${to}`);
    await test('GET', `/meters/${meterId}/alarm-summary?from=${from}&to=${to}`);
  } else {
    for (const p of ['/meters/:id', '/readings', '/uptime', '/downtime-events', '/alarm-events', '/alarm-summary']) {
      results.push({ method: 'GET', path: `/meters/:id${p} (skip)`, status: '-', summary: 'no meter id' });
    }
  }

  if (buildingId) {
    const hierarchyRes = await test('GET', `/hierarchy/${buildingId}`);
    let nodeId = buildingId;
    if (hierarchyRes.json && Array.isArray(hierarchyRes.json) && hierarchyRes.json.length > 0) {
      nodeId = hierarchyRes.json[0].id || buildingId;
    }
    await test('GET', `/hierarchy/node/${nodeId}`);
    await test('GET', `/hierarchy/node/${nodeId}/children?from=${from}&to=${to}`);
    await test('GET', `/hierarchy/node/${nodeId}/consumption?from=${from}&to=${to}&resolution=daily`);
    const debugRes = await request('GET', `/hierarchy/node/${nodeId}/consumption-debug?from=${from}&to=${to}`);
    if (debugRes.ok && debugRes.json) {
      results.push({
        method: 'GET',
        path: `/hierarchy/node/:nodeId/consumption-debug`,
        status: debugRes.status,
        summary: debugRes.json.message || `${debugRes.json.readingsTotalRows} readings, ${debugRes.json.stagingTotalRows} staging`,
      });
    }
  } else {
    results.push({ method: 'GET', path: '/hierarchy/:buildingId (skip)', status: '-', summary: '-' });
    results.push({ method: 'GET', path: '/hierarchy/node/:nodeId (skip)', status: '-', summary: '-' });
    results.push({ method: 'GET', path: '/hierarchy/node/:nodeId/children (skip)', status: '-', summary: '-' });
    results.push({ method: 'GET', path: '/hierarchy/node/:nodeId/consumption (skip)', status: '-', summary: '-' });
  }

  const alertsRes = await test('GET', '/alerts?limit=5');
  if (alertsRes.json && Array.isArray(alertsRes.json) && alertsRes.json.length > 0) {
    alertId = alertsRes.json[0].id;
  }
  if (alertId) {
    await test('GET', `/alerts/${alertId}`);
  } else {
    results.push({ method: 'GET', path: '/alerts/:id (skip)', status: '-', summary: 'no alert id' });
  }
  await test('POST', '/alerts/sync-offline');

  await test('GET', '/users');
  await test('GET', '/roles');
  await test('GET', '/views');
  await test('GET', '/db-verify');
  await test('GET', '/ingest/diagnostic');

  console.log('\nResultados:\n');
  let pass = 0;
  let fail = 0;
  for (const r of results) {
    const statusStr = String(r.status);
    const ok_ = statusStr !== '-' && ok(Number(r.status));
    if (ok_) pass++;
    else if (statusStr !== '-') fail++;
    const icon = statusStr === '-' ? ' -' : ok_ ? ' OK' : ' FAIL';
    console.log(`${r.method.padEnd(6)} ${r.path.padEnd(55)} ${statusStr.padStart(4)}${icon}  ${r.summary}`);
  }
  console.log('\n---');
  console.log(`OK: ${pass}  FAIL: ${fail}  (skip no cuenta)`);
  if (fail > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
