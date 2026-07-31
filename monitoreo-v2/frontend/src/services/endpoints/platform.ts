import api from '../api';
import { API_ROUTES } from '../routes';
import type {
  TenantUnit, CreateTenantUnitPayload, UpdateTenantUnitPayload,
  TenantUnitMeter,
} from '../../types/tenant-unit';
import type { InterventionRecord, CreateInterventionPayload } from '../../types/intervention';

export interface ApiObservabilityReport {
  from: string;
  to: string;
  granularity: string;
  periods: { period: string; totalRequests: number; errorCount: number; errorRate: number; p50Ms: number; p95Ms: number; p99Ms: number }[];
  topEndpoints: { action: string; count: number; avgMs: number; errorCount: number }[];
  summary: { totalRequests: number; errorCount: number; errorRate: number; p95Ms: number };
}

export const platformDashboardEndpoints = {
  kpis: () => api.get<import('../../types/platform-dashboard').PlatformKpis>(`${API_ROUTES.platformDashboard}/kpis`),
};

export const mapvxEndpoints = {
  malls: () => api.get<import('../../types/mapvx').MapvxMall[]>(API_ROUTES.mapvx.malls),
  stores: (mallId: string) => api.get<import('../../types/mapvx').MapvxStore[]>(API_ROUTES.mapvx.stores(mallId)),
  geometry: (mallId: string, floorKey: string, layer: string) =>
    api.get<import('../../types/mapvx').MapvxGeometry>(API_ROUTES.mapvx.geometry(mallId), {
      params: { floor_key: floorKey, layer },
    }),
};

export const tenantUnitsEndpoints = {
  list: (buildingId?: string) =>
    api.get<TenantUnit[]>(API_ROUTES.tenantUnits, { params: buildingId ? { buildingId } : undefined }),

  get: (id: string) =>
    api.get<TenantUnit>(`${API_ROUTES.tenantUnits}/${id}`),

  create: (payload: CreateTenantUnitPayload) =>
    api.post<TenantUnit>(API_ROUTES.tenantUnits, payload),

  update: (id: string, payload: UpdateTenantUnitPayload) =>
    api.patch<TenantUnit>(`${API_ROUTES.tenantUnits}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.tenantUnits}/${id}`),

  meters: (id: string) =>
    api.get<TenantUnitMeter[]>(`${API_ROUTES.tenantUnits}/${id}/meters`),

  addMeter: (id: string, meterId: string) =>
    api.post<TenantUnitMeter>(`${API_ROUTES.tenantUnits}/${id}/meters`, { meterId }),

  removeMeter: (id: string, meterId: string) =>
    api.delete(`${API_ROUTES.tenantUnits}/${id}/meters/${meterId}`),
};

export const apiObservabilityEndpoints = {
  report: (params?: { from?: string; to?: string; granularity?: string }) =>
    api.get<ApiObservabilityReport>(API_ROUTES.apiObservability, { params }),
};

export const interventionsEndpoints = {
  list: () => api.get<InterventionRecord[]>(API_ROUTES.interventions),
  create: (payload: CreateInterventionPayload) => api.post<InterventionRecord>(API_ROUTES.interventions, payload),
};
