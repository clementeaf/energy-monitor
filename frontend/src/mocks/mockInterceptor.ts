import type { InternalAxiosRequestConfig } from 'axios';
import api from '../services/api';
import { buildings } from './buildings';
import { locals } from './locals';
import { consumptionByLocal } from './consumption';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type MockHandler = (params: string[]) => unknown;

const handlers: [RegExp, MockHandler][] = [
  [/^\/buildings\/([^/]+)\/consumption$/, ([buildingId]) => {
    const bLocals = locals.filter((l) => l.buildingId === buildingId);
    const months = consumptionByLocal[bLocals[0]?.id] ?? [];
    return months.map((m, i) => ({
      month: m.month,
      consumption: bLocals.reduce(
        (sum, local) => sum + (consumptionByLocal[local.id]?.[i]?.consumption ?? 0),
        0,
      ),
      unit: 'kWh',
    }));
  }],
  [/^\/buildings\/([^/]+)\/locals$/, ([buildingId]) =>
    locals.filter((l) => l.buildingId === buildingId),
  ],
  [/^\/buildings\/([^/]+)$/, ([id]) =>
    buildings.find((b) => b.id === id),
  ],
  [/^\/buildings$/, () => buildings],
  [/^\/locals\/([^/]+)\/consumption$/, ([localId]) =>
    consumptionByLocal[localId] ?? [],
  ],
  [/^\/locals\/([^/]+)$/, ([localId]) =>
    locals.find((l) => l.id === localId),
  ],
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
      LOCALS: ['view'],
      METERS: ['view'],
      ALERTS: ['view'],
    },
  })],
  [/^\/auth\/permissions$/, () => ({
    role: 'OPERATOR',
    permissions: {
      DASHBOARD_TECHNICAL: ['view'],
      BUILDINGS: ['view'],
      LOCALS: ['view'],
      METERS: ['view'],
      ALERTS: ['view'],
    },
  })],
];

function resolve(url: string): unknown {
  for (const [pattern, handler] of handlers) {
    const match = url.match(pattern);
    if (match) return handler(match.slice(1));
  }
  return null;
}

export function enableMockInterceptor() {
  api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? '';
    const data = resolve(url);

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
