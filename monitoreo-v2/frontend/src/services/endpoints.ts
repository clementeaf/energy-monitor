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
import type {
  HierarchyNode, CreateHierarchyNodePayload, UpdateHierarchyNodePayload,
} from '../types/hierarchy';
import type { Concentrator } from '../types/concentrator';
import type { Meter } from '../types/meter';
import type { FaultEvent, FaultEventQueryParams } from '../types/fault-event';
import type {
  UserListItem, CreateUserPayload, UpdateUserPayload,
  AssignBuildingsPayload, UserBuildingsResponse,
} from '../types/user';
import type {
  TenantUnit, CreateTenantUnitPayload, UpdateTenantUnitPayload,
  TenantUnitMeter,
} from '../types/tenant-unit';
import type { AuditLogQueryParams, AuditLogResult } from '../types/audit-log';
import type { NotificationLogQueryParams, NotificationLogResult } from '../types/notification-log';
import type { EvaluateResult } from '../types/alert-engine';
import type {
  Tariff, TariffBlock, CreateTariffPayload, UpdateTariffPayload, CreateTariffBlockPayload,
} from '../types/tariff';
import type {
  Invoice, InvoiceLineItem, InvoiceQueryParams,
  CreateInvoicePayload, UpdateInvoicePayload, GenerateInvoicePayload,
} from '../types/invoice';

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

  create: (payload: CreateHierarchyNodePayload) =>
    api.post<HierarchyNode>(API_ROUTES.hierarchy, payload),

  update: (id: string, payload: UpdateHierarchyNodePayload) =>
    api.patch<HierarchyNode>(`${API_ROUTES.hierarchy}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.hierarchy}/${id}`),
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

export const tariffsEndpoints = {
  list: (buildingId?: string) =>
    api.get<Tariff[]>(API_ROUTES.tariffs, { params: buildingId ? { buildingId } : undefined }),

  get: (id: string) =>
    api.get<Tariff>(`${API_ROUTES.tariffs}/${id}`),

  create: (payload: CreateTariffPayload) =>
    api.post<Tariff>(API_ROUTES.tariffs, payload),

  update: (id: string, payload: UpdateTariffPayload) =>
    api.patch<Tariff>(`${API_ROUTES.tariffs}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.tariffs}/${id}`),

  blocks: (tariffId: string) =>
    api.get<TariffBlock[]>(`${API_ROUTES.tariffs}/${tariffId}/blocks`),

  createBlock: (tariffId: string, payload: CreateTariffBlockPayload) =>
    api.post<TariffBlock>(`${API_ROUTES.tariffs}/${tariffId}/blocks`, payload),

  removeBlock: (tariffId: string, blockId: string) =>
    api.delete(`${API_ROUTES.tariffs}/${tariffId}/blocks/${blockId}`),
};

export const invoicesEndpoints = {
  list: (params?: InvoiceQueryParams) =>
    api.get<Invoice[]>(API_ROUTES.invoices, { params }),

  get: (id: string) =>
    api.get<Invoice>(`${API_ROUTES.invoices}/${id}`),

  lineItems: (id: string) =>
    api.get<InvoiceLineItem[]>(`${API_ROUTES.invoices}/${id}/line-items`),

  create: (payload: CreateInvoicePayload) =>
    api.post<Invoice>(API_ROUTES.invoices, payload),

  update: (id: string, payload: UpdateInvoicePayload) =>
    api.patch<Invoice>(`${API_ROUTES.invoices}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.invoices}/${id}`),

  approve: (id: string) =>
    api.patch<Invoice>(`${API_ROUTES.invoices}/${id}/approve`),

  void: (id: string) =>
    api.patch<Invoice>(`${API_ROUTES.invoices}/${id}/void`),

  generate: (payload: GenerateInvoicePayload) =>
    api.post<Invoice>(`${API_ROUTES.invoices}/generate`, payload),

  pdfUrl: (id: string) =>
    `${API_ROUTES.invoices}/${id}/pdf`,
};

export const readingsEndpoints = {
  list: (params: ReadingQueryParams) =>
    api.get<Reading[]>(API_ROUTES.readings, { params }),

  latest: (params?: LatestQueryParams) =>
    api.get<LatestReading[]>(`${API_ROUTES.readings}/latest`, { params }),

  aggregated: (params: AggregatedQueryParams) =>
    api.get<AggregatedReading[]>(`${API_ROUTES.readings}/aggregated`, { params }),
};

export const usersEndpoints = {
  list: () =>
    api.get<UserListItem[]>(API_ROUTES.users),

  get: (id: string) =>
    api.get<UserListItem>(`${API_ROUTES.users}/${id}`),

  create: (payload: CreateUserPayload) =>
    api.post<UserListItem>(API_ROUTES.users, payload),

  update: (id: string, payload: UpdateUserPayload) =>
    api.patch<UserListItem>(`${API_ROUTES.users}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.users}/${id}`),

  getBuildingIds: (id: string) =>
    api.get<UserBuildingsResponse>(`${API_ROUTES.users}/${id}/buildings`),

  assignBuildings: (id: string, payload: AssignBuildingsPayload) =>
    api.patch<UserBuildingsResponse>(`${API_ROUTES.users}/${id}/buildings`, payload),
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

export const auditLogsEndpoints = {
  list: (params?: AuditLogQueryParams) =>
    api.get<AuditLogResult>(API_ROUTES.auditLogs, { params }),
};

export const notificationLogsEndpoints = {
  list: (params?: NotificationLogQueryParams) =>
    api.get<NotificationLogResult>(API_ROUTES.notificationLogs, { params }),
};

export const alertEngineEndpoints = {
  evaluate: () =>
    api.post<EvaluateResult>(`${API_ROUTES.alertEngine}/evaluate`),
};
