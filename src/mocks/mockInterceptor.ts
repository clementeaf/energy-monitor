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

    return {
      ...config,
      adapter: () =>
        Promise.resolve({
          data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }),
    } as InternalAxiosRequestConfig;
  });
}
