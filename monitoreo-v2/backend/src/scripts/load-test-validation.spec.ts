import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('load-test.k6.js validation', () => {
  const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'load-test.k6.js');
  const source = readFileSync(scriptPath, 'utf-8');

  it('defines 5 test scenarios', () => {
    const scenarios = ['dashboard', 'realtime', 'timeseries', 'auth', 'buildings'];
    for (const name of scenarios) {
      expect(source).toContain(`${name}:`);
    }
  });

  it('exports scenario functions', () => {
    const exports = [
      'dashboardScenario',
      'realtimeScenario',
      'timeseriesScenario',
      'authScenario',
      'buildingsScenario',
    ];
    for (const fn of exports) {
      expect(source).toContain(`export function ${fn}`);
    }
  });

  it('defines ARQ-07 threshold: dashboard p95 < 3s', () => {
    expect(source).toContain("dashboard_duration: ['p(95)<3000']");
  });

  it('defines INT-08 threshold: API p95 < 500ms', () => {
    expect(source).toContain("api_duration: ['p(95)<500']");
  });

  it('defines error rate threshold < 1%', () => {
    expect(source).toContain("errors: ['rate<0.01']");
  });

  it('uses BASE_URL environment variable', () => {
    expect(source).toContain('__ENV.BASE_URL');
  });

  it('uses TOKEN environment variable for auth', () => {
    expect(source).toContain('__ENV.TOKEN');
    expect(source).toContain('Authorization');
  });

  it('tests aggregated readings endpoint', () => {
    expect(source).toContain('/readings/aggregated');
    expect(source).toContain('groupBy=portfolio');
  });

  it('tests latest readings endpoint', () => {
    expect(source).toContain('/readings/latest');
  });

  it('tests raw time-series with resolution', () => {
    expect(source).toContain('resolution=15min');
  });

  it('uses k6 check() for response validation', () => {
    expect(source).toContain("check(res,");
  });

  it('tracks custom metrics (dashboardDuration, apiDuration)', () => {
    expect(source).toContain("new Trend('dashboard_duration'");
    expect(source).toContain("new Trend('api_duration'");
    expect(source).toContain("new Rate('errors')");
  });
});
