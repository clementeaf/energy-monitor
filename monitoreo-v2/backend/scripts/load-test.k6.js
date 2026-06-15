/**
 * ARQ-17: k6 load test for Energy Monitor v2 API.
 *
 * Usage:
 *   k6 run scripts/load-test.k6.js --env BASE_URL=http://localhost:4000/api
 *   k6 run scripts/load-test.k6.js --env BASE_URL=https://power-monitor.cloud/api --env TOKEN=<jwt>
 *
 * Scenarios:
 *   1. Dashboard load (aggregated readings)
 *   2. Real-time latest readings
 *   3. Raw time-series readings
 *   4. Auth /me profile
 *   5. Buildings list
 *
 * Thresholds (ARQ-07):
 *   - 95th percentile < 3s for dashboard
 *   - 95th percentile < 500ms for API calls (INT-08)
 *   - Error rate < 1%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api';
const TOKEN = __ENV.TOKEN || '';

const errorRate = new Rate('errors');
const dashboardDuration = new Trend('dashboard_duration', true);
const apiDuration = new Trend('api_duration', true);

export const options = {
  scenarios: {
    dashboard: {
      executor: 'constant-vus',
      vus: 10,
      duration: '60s',
      exec: 'dashboardScenario',
    },
    realtime: {
      executor: 'constant-vus',
      vus: 5,
      duration: '60s',
      exec: 'realtimeScenario',
      startTime: '10s',
    },
    timeseries: {
      executor: 'constant-vus',
      vus: 3,
      duration: '60s',
      exec: 'timeseriesScenario',
      startTime: '20s',
    },
    auth: {
      executor: 'constant-vus',
      vus: 2,
      duration: '60s',
      exec: 'authScenario',
      startTime: '5s',
    },
    buildings: {
      executor: 'constant-vus',
      vus: 2,
      duration: '60s',
      exec: 'buildingsScenario',
      startTime: '5s',
    },
  },
  thresholds: {
    // ARQ-07: Dashboards < 3s
    dashboard_duration: ['p(95)<3000'],
    // INT-08: API calls < 500ms at p95
    api_duration: ['p(95)<500'],
    // Error rate < 1%
    errors: ['rate<0.01'],
    // Overall HTTP response times
    http_req_duration: ['p(95)<3000'],
  },
};

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
  return h;
}

// Scenario 1: Dashboard aggregated readings (heaviest query)
export function dashboardScenario() {
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const url = `${BASE_URL}/readings/aggregated?interval=daily&from=${weekAgo}&to=${now}&groupBy=portfolio`;

  const res = http.get(url, { headers: headers(), tags: { scenario: 'dashboard' } });
  dashboardDuration.add(res.timings.duration);
  check(res, { 'dashboard 2xx': (r) => r.status >= 200 && r.status < 300 });
  errorRate.add(res.status >= 400);
  sleep(1);
}

// Scenario 2: Real-time latest readings
export function realtimeScenario() {
  const url = `${BASE_URL}/readings/latest`;
  const res = http.get(url, { headers: headers(), tags: { scenario: 'realtime' } });
  apiDuration.add(res.timings.duration);
  check(res, { 'latest 2xx': (r) => r.status >= 200 && r.status < 300 });
  errorRate.add(res.status >= 400);
  sleep(2);
}

// Scenario 3: Raw time-series readings for a single meter
export function timeseriesScenario() {
  const now = new Date().toISOString();
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  // Uses a placeholder meter ID — override via k6 environment or CSV data file
  const meterId = __ENV.METER_ID || '00000000-0000-0000-0000-000000000001';
  const url = `${BASE_URL}/readings?meterId=${meterId}&from=${dayAgo}&to=${now}&resolution=15min`;

  const res = http.get(url, { headers: headers(), tags: { scenario: 'timeseries' } });
  apiDuration.add(res.timings.duration);
  check(res, { 'timeseries 2xx': (r) => r.status >= 200 && r.status < 300 });
  errorRate.add(res.status >= 400);
  sleep(3);
}

// Scenario 4: Auth profile
export function authScenario() {
  const url = `${BASE_URL}/auth/me`;
  const res = http.get(url, { headers: headers(), tags: { scenario: 'auth' } });
  apiDuration.add(res.timings.duration);
  check(res, { 'auth 2xx': (r) => r.status >= 200 && r.status < 300 });
  errorRate.add(res.status >= 400);
  sleep(5);
}

// Scenario 5: Buildings list
export function buildingsScenario() {
  const url = `${BASE_URL}/buildings`;
  const res = http.get(url, { headers: headers(), tags: { scenario: 'buildings' } });
  apiDuration.add(res.timings.duration);
  check(res, { 'buildings 2xx': (r) => r.status >= 200 && r.status < 300 });
  errorRate.add(res.status >= 400);
  sleep(5);
}
