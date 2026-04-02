import api from './api';
import { API_ROUTES } from './routes';
import type { AuthProvider, MeResponse } from '../types/auth';
import type { Building, CreateBuildingPayload, UpdateBuildingPayload } from '../types/building';
import type { Meter, CreateMeterPayload, UpdateMeterPayload } from '../types/meter';
import type {
  Alert, AlertQueryParams, ResolveAlertPayload,
  AlertRule, CreateAlertRulePayload, UpdateAlertRulePayload,
} from '../types/alert';
import type {
  Reading, ReadingQueryParams, LatestQueryParams, LatestReading,
  AggregatedQueryParams, AggregatedReading,
} from '../types/reading';
import type { HierarchyNode } from '../types/hierarchy';
import type { Concentrator } from '../types/concentrator';
import type { Meter } from '../types/meter';
import type { FaultEvent, FaultEventQueryParams } from '../types/fault-event';

export const authEndpoints = {
  login: (provider: AuthProvider, idToken: string) =>
    api.post<{ success: boolean }>(API_ROUTES.auth.login, { provider, idToken }),

  me: () =>
    api.get<MeResponse>(API_ROUTES.auth.me),

  logout: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.logout),

  refresh: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.refresh),
};

export const buildingsEndpoints = {
  list: () =>
    api.get<Building[]>(API_ROUTES.buildings),

  get: (id: string) =>
    api.get<Building>(`${API_ROUTES.buildings}/${id}`),

  create: (payload: CreateBuildingPayload) =>
    api.post<Building>(API_ROUTES.buildings, payload),

  update: (id: string, payload: UpdateBuildingPayload) =>
    api.patch<Building>(`${API_ROUTES.buildings}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.buildings}/${id}`),
};

export const metersEndpoints = {
  list: (buildingId?: string) =>
    api.get<Meter[]>(API_ROUTES.meters, { params: buildingId ? { buildingId } : undefined }),

  get: (id: string) =>
    api.get<Meter>(`${API_ROUTES.meters}/${id}`),

  create: (payload: CreateMeterPayload) =>
    api.post<Meter>(API_ROUTES.meters, payload),

  update: (id: string, payload: UpdateMeterPayload) =>
    api.patch<Meter>(`${API_ROUTES.meters}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.meters}/${id}`),
};

export const alertsEndpoints = {
  list: (params?: AlertQueryParams) =>
    api.get<Alert[]>(API_ROUTES.alerts, { params }),

  get: (id: string) =>
    api.get<Alert>(`${API_ROUTES.alerts}/${id}`),

  acknowledge: (id: string) =>
    api.patch<Alert>(`${API_ROUTES.alerts}/${id}/acknowledge`),

  resolve: (id: string, payload?: ResolveAlertPayload) =>
    api.patch<Alert>(`${API_ROUTES.alerts}/${id}/resolve`, payload),
};

export const alertRulesEndpoints = {
  list: (buildingId?: string) =>
    api.get<AlertRule[]>(API_ROUTES.alertRules, { params: buildingId ? { buildingId } : undefined }),

  get: (id: string) =>
    api.get<AlertRule>(`${API_ROUTES.alertRules}/${id}`),

  create: (payload: CreateAlertRulePayload) =>
    api.post<AlertRule>(API_ROUTES.alertRules, payload),

  update: (id: string, payload: UpdateAlertRulePayload) =>
    api.patch<AlertRule>(`${API_ROUTES.alertRules}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.alertRules}/${id}`),
};

export const hierarchyEndpoints = {
  byBuilding: (buildingId: string) =>
    api.get<HierarchyNode[]>(`${API_ROUTES.hierarchy}/buildings/${buildingId}`),

  get: (id: string) =>
    api.get<HierarchyNode>(`${API_ROUTES.hierarchy}/${id}`),

  meters: (nodeId: string) =>
    api.get<Meter[]>(`${API_ROUTES.hierarchy}/${nodeId}/meters`),
};

export const concentratorsEndpoints = {
  list: (buildingId?: string) =>
    api.get<Concentrator[]>(API_ROUTES.concentrators, { params: buildingId ? { buildingId } : undefined }),

  get: (id: string) =>
    api.get<Concentrator>(`${API_ROUTES.concentrators}/${id}`),

  meters: (id: string) =>
    api.get<Meter[]>(`${API_ROUTES.concentrators}/${id}/meters`),
};

export const faultEventsEndpoints = {
  list: (params?: FaultEventQueryParams) =>
    api.get<FaultEvent[]>(API_ROUTES.faultEvents, { params }),

  get: (id: string) =>
    api.get<FaultEvent>(`${API_ROUTES.faultEvents}/${id}`),
};

export const readingsEndpoints = {
  list: (params: ReadingQueryParams) =>
    api.get<Reading[]>(API_ROUTES.readings, { params }),

  latest: (params?: LatestQueryParams) =>
    api.get<LatestReading[]>(`${API_ROUTES.readings}/latest`, { params }),

  aggregated: (params: AggregatedQueryParams) =>
    api.get<AggregatedReading[]>(`${API_ROUTES.readings}/aggregated`, { params }),
};
