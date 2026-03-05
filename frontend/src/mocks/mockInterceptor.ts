import type { InternalAxiosRequestConfig } from 'axios';
import api from '../services/api';
import { buildings } from './buildings';
import { meters } from './meters';
import { readingsByMeter, getDailyConsumption } from './readings';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type MockHandler = (params: string[]) => unknown;

const isDemoMode = import.meta.env.VITE_AUTH_MODE === 'demo';

const dataHandlers: [RegExp, MockHandler][] = [
  [/^\/buildings\/([^/]+)\/consumption$/, ([buildingId]) =>
    getDailyConsumption(buildingId),
  ],
  [/^\/buildings\/([^/]+)\/meters$/, ([buildingId]) =>
    meters.filter((m) => m.buildingId === buildingId),
  ],
  [/^\/buildings\/([^/]+)$/, ([id]) => {
    const b = buildings.find((b) => b.id === id);
    return b ? { ...b, metersCount: meters.filter((m) => m.buildingId === id).length } : undefined;
  }],
  [/^\/buildings$/, () => buildings],
  [/^\/meters\/([^/]+)\/readings/, ([meterId]) =>
    readingsByMeter[meterId] ?? [],
  ],
  [/^\/meters\/([^/]+)$/, ([meterId]) =>
    meters.find((m) => m.id === meterId),
  ],
];

const authHandlers: [RegExp, MockHandler][] = [
  [/^\/auth\/me$/, () => ({
    user: {
      id: 'demo-user-001',
      email: 'operator@powerdigital.cl',
      name: 'Demo Operator',
      role: 'OPERATOR',
      provider: 'demo',
      avatar: null,
      siteIds: ['*'],
    },
    permissions: {
      DASHBOARD_TECHNICAL: ['view'],
      BUILDINGS: ['view'],
      METERS: ['view'],
      ALERTS: ['view'],
    },
  })],
  [/^\/auth\/permissions$/, () => ({
    role: 'OPERATOR',
    permissions: {
      DASHBOARD_TECHNICAL: ['view'],
      BUILDINGS: ['view'],
      METERS: ['view'],
      ALERTS: ['view'],
    },
  })],
];

const handlers: [RegExp, MockHandler][] = isDemoMode
  ? [...dataHandlers, ...authHandlers]
  : dataHandlers;

const NO_MATCH = Symbol('no-match');

function resolve(url: string): unknown {
  for (const [pattern, handler] of handlers) {
    const match = url.match(pattern);
    if (match) return handler(match.slice(1));
  }
  return NO_MATCH;
}

export function enableMockInterceptor() {
  api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? '';
    const data = resolve(url);

    // No mock handler → let request pass through to real backend
    if (data === NO_MATCH) return config;

    await delay(150 + Math.random() * 150);

    const found = data !== null && data !== undefined;

    return {
      ...config,
      adapter: () =>
        found
          ? Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
          : Promise.reject(
              Object.assign(new Error('Not Found'), {
                response: { data: { message: 'Not Found' }, status: 404, statusText: 'Not Found', headers: {}, config },
                isAxiosError: true,
              }),
            ),
    } as InternalAxiosRequestConfig;
  });
}
