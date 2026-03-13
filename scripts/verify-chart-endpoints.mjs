#!/usr/bin/env node
/**
 * Verifica que los endpoints que alimentan los gráficos del frontend devuelvan datos.
 * Uso:
 *   BEARER_TOKEN=<token> node scripts/verify-chart-endpoints.mjs
 *   BEARER_TOKEN=<token> node scripts/verify-chart-endpoints.mjs http://localhost:3000/api
 * Obtener token: login en la app, sessionStorage.getItem('access_token') en consola.
 */

const BASE = process.argv[2] || process.env.API_BASE_URL || 'https://energymonitor.click/api';
const TOKEN =
  process.env.BEARER_TOKEN ||
  'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjUzMDcyNGQ0OTE3M2EzZWQ2YjRhMDBhYTYzNDQyMDMwMGQ3MmFlNWIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI0MjA4NTI0MDExNTktaXY4dHJ1ZGFlM3A3N2NiZ2NnYWdjMHBibGxrYmNhZzQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI0MjA4NTI0MDExNTktaXY4dHJ1ZGFlM3A3N2NiZ2NnYWdjMHBibGxrYmNhZzQuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTAwNDYyNjk0NjAxNDUyMzE3NjQiLCJlbWFpbCI6ImNhcnJpYWdhZGFmYWxjb25lQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJub25jZSI6IjI4YzMxYmFlLWYzYjMtNDcwNi04ZTg5LWM4MGQ5MjcwYWJhZiIsIm5iZiI6MTc3MzM1Nzc3MCwibmFtZSI6ImNsZW1lbnRlIGFycmlhZ2FkYSBmYWxjb25lIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0s5aG10ZVE3aUhZOGJQOWVYeE1ZYVZDQmF2RTk0UmxqaDJPSWxUTHpEd2pJVV9Ndz1zOTYtYyIsImdpdmVuX25hbWUiOiJjbGVtZW50ZSIsImZhbWlseV9uYW1lIjoiYXJyaWFnYWRhIGZhbGNvbmUiLCJpYXQiOjE3NzMzNTgwNzAsImV4cCI6MTc3MzM2MTY3MCwianRpIjoiM2RhMWUwYzg0ZmMyZjEyZDVlYzA2OGE3NjU1YjE3MWMwYmUwNTg2NyJ9.dPyQG7WKYidh9YD-exgLjwdsyeAa79Z2ynsfZCXVoCbwHp4sbdhVHAtKDN-wc-DuC4fTJwl5XhrSnuOgzL_fxCG-G1J1fQvAvjhbXT_rCqfDaqfpwI-TR_hYEC9G8PA-wwcHAJFfiuovcARQyu5cLwzy2dZb3R2cow6MJBy27d8st4CihyXW2sq8BY6zb5S9Q8tUoJeQYiYZiEIJlaiWsG--ijFdWhbOO9-zBzTMROck6spUT7W1W2NcF8_n1dx58oXC7J2W6hsI3snFPN0oekmu8vvXnotqprlG0LoWygozsfO04XLnHQ7W5QJWUav8oMHkw_6TOKWaXKEtczaWYw';

const headers = {
  Authorization: TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

const REQUEST_TIMEOUT_MS = 35000;

/** Rango últimos 30 días (igual que BuildingDetailPage). */
function range30d() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 19) + 'Z', to: to.toISOString().slice(0, 19) + 'Z' };
}

/** Rango últimos 7 días (igual que MeterDetailPage). */
function range7d() {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 19) + 'Z', to: to.toISOString().slice(0, 19) + 'Z' };
}

async function request(method, path, body = undefined) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      signal: ac.signal,
      headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    clearTimeout(t);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_) {}
    return { status: res.status, ok: res.ok, text, json };
  } catch (err) {
    clearTimeout(t);
    return { status: 0, ok: false, text: err.message || 'timeout/network', json: null };
  }
}

/**
 * @param {string} label
 * @param {string} graph
 * @param {Promise<{ status: number; ok: boolean; json: unknown }>} req
 * @returns {{ label: string; graph: string; status: number; data: string }}
 */
async function check(label, graph, req) {
  const res = await req;
  let data = '';
  if (res.status === 200 && res.json != null) {
    const j = res.json;
    if (Array.isArray(j)) {
      const len = j.length;
      if (len === 0) data = '0 puntos';
      else if (j[0] && typeof j[0] === 'object' && 'timestamp' in j[0]) {
        const withVal = j.filter((p) => p && (p.totalPowerKw != null || p.powerKw != null || p.energyKwhTotal != null));
        data = `${len} puntos (${withVal.length} con valor)`;
      } else if (j[0] && typeof j[0] === 'object' && 'totalKwh' in j[0]) {
        const withKwh = j.filter((c) => c && Number(c.totalKwh) > 0);
        data = `${len} hijos (${withKwh.length} con totalKwh>0)`;
      } else {
        data = `${len} ítems`;
      }
    } else if (typeof j === 'object' && j !== null && 'node' in j) {
      data = 'nodo + path';
    } else if (typeof j === 'object' && j !== null) {
      data = 'OK';
    }
  } else {
    data = res.status > 0 ? `HTTP ${res.status}` : res.text || 'error';
  }
  return { label, graph, status: res.status, data };
}

async function run() {
  const r30 = range30d();
  const r7 = range7d();
  const rows = [];

  console.log('Verificación endpoints que alimentan gráficos del frontend');
  console.log('Base URL:', BASE);
  console.log('Rango edificio/children: 30 días. Rango medidor: 7 días.\n');

  const meRes = await request('GET', '/auth/me');
  if (meRes.status !== 200 || !meRes.json?.user) {
    console.error('Auth falló. Usar BEARER_TOKEN válido.');
    process.exit(1);
  }

  const buildingsRes = await request('GET', '/buildings');
  const buildings = Array.isArray(buildingsRes.json) ? buildingsRes.json : [];
  const buildingId = buildings[0]?.id ?? null;

  const overviewRes = await request('GET', '/meters/overview');
  const meters = Array.isArray(overviewRes.json) ? overviewRes.json : [];
  const meterId = meters[0]?.id ?? null;

  rows.push(await check('GET /buildings', 'Listado edificios', request('GET', '/buildings')));
  rows.push(await check('GET /meters/overview', 'Tabla dispositivos / Realtime', request('GET', '/meters/overview')));

  if (buildingId) {
    rows.push(
      await check(
        `GET /buildings/${buildingId}/consumption`,
        'Gráfico consumo edificio (BuildingDetailPage)',
        request('GET', `/buildings/${buildingId}/consumption?from=${r30.from}&to=${r30.to}&resolution=daily`),
      ),
    );
    rows.push(
      await check(
        `GET /hierarchy/${buildingId}`,
        'Árbol jerarquía (sidebar / drill-down entrada)',
        request('GET', `/hierarchy/${buildingId}`),
      ),
    );
    const rootNodeId = `B-${buildingId.toUpperCase()}`;
    rows.push(
      await check(
        `GET /hierarchy/node/${rootNodeId}`,
        'Nodo raíz drill-down (DrilldownPage)',
        request('GET', `/hierarchy/node/${rootNodeId}`),
      ),
    );
    rows.push(
      await check(
        `GET /hierarchy/node/${rootNodeId}/children`,
        'Barras drill-down (hijos con totalKwh; con from/to)',
        request('GET', `/hierarchy/node/${rootNodeId}/children?from=${r30.from}&to=${r30.to}`),
      ),
    );
    rows.push(
      await check(
        `GET /hierarchy/node/${rootNodeId}/consumption`,
        'Time-series por nodo (opcional)',
        request('GET', `/hierarchy/node/${rootNodeId}/consumption?from=${r30.from}&to=${r30.to}&resolution=daily`),
      ),
    );
  } else {
    rows.push({ label: 'GET /buildings/:id/consumption', graph: 'Gráfico edificio', status: '-', data: 'sin buildingId' });
    rows.push({ label: 'GET /hierarchy/:id', graph: 'Árbol', status: '-', data: '-' });
    rows.push({ label: 'GET /hierarchy/node/B-:id', graph: 'Nodo raíz', status: '-', data: '-' });
    rows.push({ label: 'GET /hierarchy/node/:id/children', graph: 'Barras drill-down', status: '-', data: '-' });
    rows.push({ label: 'GET /hierarchy/node/:id/consumption', graph: 'Time-series nodo', status: '-', data: '-' });
  }

  if (meterId) {
    rows.push(
      await check(
        `GET /meters/${meterId}/readings`,
        '6 gráficos detalle medidor (MeterDetailPage)',
        request('GET', `/meters/${meterId}/readings?from=${r7.from}&to=${r7.to}&resolution=hourly`),
      ),
    );
  } else {
    rows.push({ label: 'GET /meters/:id/readings', graph: 'Gráficos medidor', status: '-', data: 'sin meterId' });
  }

  console.log('Endpoint (resumen)                                    | Gráfico / Vista           | Status | Datos');
  console.log('-'.repeat(110));
  for (const r of rows) {
    const statusStr = r.status === '-' ? '-' : String(r.status);
    const ok = statusStr !== '-' && r.status === 200;
    const icon = statusStr === '-' ? '' : ok ? ' OK' : ' FAIL';
    console.log(
      `${r.label.slice(0, 54).padEnd(54)} | ${r.graph.padEnd(26)} | ${statusStr.padStart(6)}${icon} | ${r.data}`,
    );
  }
  console.log('');
  const failed = rows.filter((r) => r.status !== '-' && r.status !== 200);
  if (failed.length > 0) {
    console.log('Endpoints con error:', failed.map((f) => f.label).join(', '));
    process.exit(1);
  }
  const empty = rows.filter(
    (r) =>
      r.status === 200 &&
      r.data &&
      (r.data === '0 puntos' ||
        r.data.startsWith('0 ítems') ||
        r.data === '0 hijos (0 con totalKwh>0)' ||
        /^0 puntos \(0 con valor\)$/.test(r.data)),
  );
  if (empty.length > 0) {
    console.log('Endpoints que responden 200 pero sin datos para gráfico:', empty.map((e) => e.label).join(', '));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
