import api from './api';
import { API_ROUTES } from './routes';
import type { AuthProvider, MeResponse } from '../types/auth';
import type { Tenant, CreateTenantPayload, OnboardingResult, UpdateTenantPayload } from '../types/tenant';
import type { ApiKey, ApiKeyCreationResult, ApiKeyScopeMeta, CreateApiKeyPayload, UpdateApiKeyPayload } from '../types/api-key';
import type { Role, Permission, CreateRolePayload, UpdateRolePayload } from '../types/role';
import type { Building, CreateBuildingPayload, UpdateBuildingPayload } from '../types/building';
import type { Meter, CreateMeterPayload, UpdateMeterPayload } from '../types/meter';
import type {
  Alert, AlertQueryParams, ResolveAlertPayload,
  AlertRule, CreateAlertRulePayload, UpdateAlertRulePayload,
} from '../types/alert';
import type {
  Reading, ReadingQueryParams, LatestQueryParams, LatestReading, LatestReadingAnchor,
  AggregatedQueryParams, AggregatedReading, CompareBuildingsResponse,
} from '../types/reading';
import type {
  HierarchyNode, CreateHierarchyNodePayload, UpdateHierarchyNodePayload,
} from '../types/hierarchy';
import type { Concentrator } from '../types/concentrator';
import type { FaultEvent, FaultEventQueryParams } from '../types/fault-event';
import type {
  UserListItem, CreateUserPayload, UpdateUserPayload,
  AssignBuildingsPayload, UserBuildingsResponse,
} from '../types/user';
import type {
  ValidateUserImportResponse,
  UserImportJobDetailResponse,
  UserImportRowsResponse,
  UserImportJobsListResponse,
  CommitUserImportPayload,
  CommitUserImportResponse,
  UserImportRowsQueryParams,
} from '../types/user-import';
import type {
  ValidateBuildingImportResponse,
  BuildingImportJobDetailResponse,
  BuildingImportRowsResponse,
  BuildingImportJobsListResponse,
  CommitBuildingImportResponse,
  BuildingImportRowsQueryParams,
} from '../types/building-import';
import type {
  ValidateTenantUnitImportResponse,
  TenantUnitImportJobDetailResponse,
  TenantUnitImportRowsResponse,
  TenantUnitImportJobsListResponse,
  CommitTenantUnitImportResponse,
  TenantUnitImportRowsQueryParams,
} from '../types/tenant-unit-import';
import type {
  ValidateMeterImportResponse,
  MeterImportJobDetailResponse,
  MeterImportRowsResponse,
  MeterImportJobsListResponse,
  CommitMeterImportResponse,
  MeterImportRowsQueryParams,
} from '../types/meter-import';
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
import type {
  Report,
  ReportQueryParams,
  GenerateReportPayload,
  ScheduledReport,
  ScheduledReportQueryParams,
  CreateScheduledReportPayload,
  UpdateScheduledReportPayload,
} from '../types/report';
import type {
  Integration,
  IntegrationQueryParams,
  IntegrationSyncLog,
  IntegrationSyncLogsResult,
  IntegrationSyncLogsParams,
  CreateIntegrationPayload,
  UpdateIntegrationPayload,
} from '../types/integration';
import type {
  SsoPublicConfig,
  SsoStartResult,
  TenantSsoAdminConfig,
  UpsertTenantSsoPayload,
} from '../types/sso';
import type {
  OAuthClient,
  OAuthClientCreationResult,
  CreateOAuthClientPayload,
  UpdateOAuthClientPayload,
} from '../types/oauth-client';
import type {
  WebhookSubscription,
  CreateWebhookSubscriptionPayload,
  UpdateWebhookSubscriptionPayload,
  WebhookSubscriptionQueryParams,
} from '../types/webhook';
import type { IntegrationsHealthResponse } from '../types/integrations-health';
import type { DataQualityReportResponse, DataQualityReportParams } from '../types/data-quality';
import type {
  BalanceAnomaly,
  BalanceAnomalyQueryParams,
  DataContract,
  DataSloBreach,
} from '../types/data-governance';
import type { IngestGapListParams, IngestGapListResponse } from '../types/ingest-gap';
import type { BackfillJob, CreateBackfillJobPayload } from '../types/backfill-job';
import type {
  WebhookDeliveryLogListResponse,
  WebhookDeliveryLogQueryParams,
} from '../types/webhook-delivery-log';
import type { Region, CreateRegionPayload, UpdateRegionPayload } from '../types/region';
import type {
  BreachReport,
  CreateBreachReportPayload,
  UpdateBreachReportPayload,
} from '../types/breach-report';
import type {
  RegisterMapping,
  ProtocolType,
  RegisterMappingQueryParams,
  CreateRegisterMappingPayload,
  UpdateRegisterMappingPayload,
} from '../types/register-mapping';

export interface MfaSetupResponse {
  secret: string;
  qrDataUrl: string;
  otpauthUrl: string;
}

export const authEndpoints = {
  clearSessionCookies: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.clearSession),

  login: (provider: AuthProvider, idToken: string) =>
    api.post<{
      success?: boolean;
      mfaRequired?: boolean;
      mfaSetupRequired?: boolean;
      userId?: string;
      secret?: string;
      qrDataUrl?: string;
      otpauthUrl?: string;
      accessToken?: string;
    }>(API_ROUTES.auth.login, { provider, idToken }),

  me: () =>
    api.get<MeResponse>(API_ROUTES.auth.me),

  logout: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.logout),

  refresh: () =>
    api.post<{ success: boolean; accessToken?: string }>(API_ROUTES.auth.refresh),

  mfaSetup: (forceRegenerate = false) =>
    api.post<MfaSetupResponse>(API_ROUTES.auth.mfaSetup, { forceRegenerate }),

  mfaVerify: (code: string) =>
    api.post<{ success: boolean; mfaEnabled: boolean; recoveryCodes?: string[] }>(API_ROUTES.auth.mfaVerify, { code }),

  mfaVerifySetup: (userId: string, code: string) =>
    api.post<
      { success: boolean; mfaEnabled: boolean; recoveryCodes?: string[]; accessToken?: string } & Partial<MeResponse>
    >(API_ROUTES.auth.mfaVerifySetup, { userId, code }),

  mfaValidate: (userId: string, code: string) =>
    api.post<{ success: boolean; accessToken?: string } & Partial<MeResponse>>(
      API_ROUTES.auth.mfaValidate,
      { userId, code },
    ),

  mfaStatus: () =>
    api.get<{ mfaEnabled: boolean }>(API_ROUTES.auth.mfaStatus),

  mfaDisable: () =>
    api.delete<{ success: boolean; mfaEnabled: boolean }>(API_ROUTES.auth.mfaDisable),

  acceptPrivacy: () =>
    api.post<{ success: boolean; version: string }>(API_ROUTES.auth.acceptPrivacy),

  meExport: () =>
    api.get<Record<string, unknown>>(API_ROUTES.auth.meExport),

  meDeletionRequest: (reason?: string) =>
    api.post<{ requestId: string; requestedAt: string } | { alreadyRequested: boolean; requestId: string }>(
      API_ROUTES.auth.meDeletionRequest, { reason }),

  updateMe: (data: { displayName?: string }) =>
    api.patch<{ success: boolean }>(API_ROUTES.auth.updateMe, data),

  oppose: (reason?: string) =>
    api.post<{ success: boolean }>(API_ROUTES.auth.oppose, { reason }),

  block: (reason?: string) =>
    api.post<{ success: boolean }>(API_ROUTES.auth.block, { reason }),

  revokePrivacy: () =>
    api.post<{ success: boolean }>(API_ROUTES.auth.revokePrivacy),

  rectificationRequest: (fieldName: string, requestedValue: string, reason?: string) =>
    api.post<{ requestId: string; responseDeadline: string }>(
      API_ROUTES.auth.rectificationRequest, { fieldName, requestedValue, reason }),

  automatedDecisions: (optOut: boolean) =>
    api.post<{ success: boolean }>(API_ROUTES.auth.automatedDecisions, { optOut }),
};

export const ssoEndpoints = {
  getPublicConfig: (tenantSlug: string) =>
    api.get<SsoPublicConfig>(API_ROUTES.auth.ssoConfig(tenantSlug)),

  startLogin: (tenantSlug: string) =>
    api.get<SsoStartResult>(API_ROUTES.auth.ssoStart(tenantSlug)),
};

export interface DeletionRequestItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  requestedAt: string;
  resolvedAt: string | null;
  resolvedByEmail: string | null;
  notes: string | null;
}

export const deletionRequestsEndpoints = {
  list: () =>
    api.get<DeletionRequestItem[]>(API_ROUTES.deletionRequests),

  resolve: (id: string, status: 'approved' | 'rejected', notes?: string) =>
    api.patch<{ success: boolean }>(`${API_ROUTES.deletionRequests}/${id}/resolve`, { status, notes }),

  execute: (id: string) =>
    api.patch<{ success: boolean; anonymizedEmail: string }>(`${API_ROUTES.deletionRequests}/${id}/execute`),
};

export interface RectificationRequestItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  fieldName: string;
  currentValue: string | null;
  requestedValue: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  requestedAt: string;
  responseDeadline: string;
  resolvedAt: string | null;
  resolvedByEmail: string | null;
  notes: string | null;
}

export const rectificationRequestsEndpoints = {
  list: () =>
    api.get<RectificationRequestItem[]>(API_ROUTES.rectificationRequests),

  resolve: (id: string, status: 'approved' | 'rejected', notes?: string) =>
    api.patch<{ success: boolean }>(`${API_ROUTES.rectificationRequests}/${id}/resolve`, { status, notes }),

  execute: (id: string) =>
    api.patch<{ success: boolean }>(`${API_ROUTES.rectificationRequests}/${id}/execute`),
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
  list: (buildingId?: string) => {
    const params: Record<string, string> = {};
    if (buildingId) params.buildingId = buildingId;
    return api.get<Meter[] | { data: Meter[]; total: number }>(API_ROUTES.meters, Object.keys(params).length > 0 ? { params } : undefined);
  },

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
    api.get<Invoice[] | { data: Invoice[]; total: number }>(API_ROUTES.invoices, { params }),

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

  my: (params?: { limit?: number; offset?: number }) =>
    api.get<Invoice[] | { data: Invoice[]; total: number }>(`${API_ROUTES.invoices}/my`, { params }),

  pdfUrl: (id: string, tenantId?: string) => {
    const b = import.meta.env.VITE_API_BASE_URL || '/api';
    const base = b.endsWith('/') ? b.slice(0, -1) : b;
    const path = `${base}${API_ROUTES.invoices}/${id}/pdf`;
    if (!tenantId) {
      return path;
    }
    return `${path}?tenantId=${encodeURIComponent(tenantId)}`;
  },
};

const apiBase = (): string => {
  const b = import.meta.env.VITE_API_BASE_URL || '/api';
  return b.endsWith('/') ? b.slice(0, -1) : b;
};

export const reportsEndpoints = {
  list: (params?: ReportQueryParams) =>
    api.get<Report[]>(API_ROUTES.reports, { params }),

  get: (id: string) =>
    api.get<Report>(`${API_ROUTES.reports}/${id}`),

  generate: ({ buildingId, ...rest }: GenerateReportPayload) =>
    api.post<Report>(`${API_ROUTES.reports}/generate`, { ...rest, ...(buildingId ? { buildingId } : {}) }),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.reports}/${id}`),

  exportHref: (id: string, tenantId?: string): string => {
    let url = `${apiBase()}${API_ROUTES.reports}/${id}/export`;
    if (tenantId) {
      url += `?tenantId=${encodeURIComponent(tenantId)}`;
    }
    return url;
  },

  scheduledList: (params?: ScheduledReportQueryParams) =>
    api.get<ScheduledReport[]>(`${API_ROUTES.reports}/scheduled`, { params }),

  scheduledCreate: (payload: CreateScheduledReportPayload) =>
    api.post<ScheduledReport>(`${API_ROUTES.reports}/scheduled`, payload),

  scheduledUpdate: (id: string, payload: UpdateScheduledReportPayload) =>
    api.patch<ScheduledReport>(`${API_ROUTES.reports}/scheduled/${id}`, payload),

  scheduledRemove: (id: string) =>
    api.delete(`${API_ROUTES.reports}/scheduled/${id}`),
};

export const integrationsEndpoints = {
  list: (params?: IntegrationQueryParams) =>
    api.get<Integration[]>(API_ROUTES.integrations, { params }),

  get: (id: string) =>
    api.get<Integration>(`${API_ROUTES.integrations}/${id}`),

  create: (payload: CreateIntegrationPayload) =>
    api.post<Integration>(API_ROUTES.integrations, payload),

  update: (id: string, payload: UpdateIntegrationPayload) =>
    api.patch<Integration>(`${API_ROUTES.integrations}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.integrations}/${id}`),

  sync: (id: string) =>
    api.post<IntegrationSyncLog>(`${API_ROUTES.integrations}/${id}/sync`, {}),

  syncLogs: (id: string, params?: IntegrationSyncLogsParams) =>
    api.get<IntegrationSyncLogsResult>(`${API_ROUTES.integrations}/${id}/sync-logs`, { params }),

  health: () =>
    api.get<IntegrationsHealthResponse>(API_ROUTES.integrationsHealth),
};

export const readingsEndpoints = {
  list: (params: ReadingQueryParams) =>
    api.get<Reading[]>(API_ROUTES.readings, { params }),

  latest: (params?: LatestQueryParams) =>
    api.get<LatestReading[]>(`${API_ROUTES.readings}/latest`, { params }),

  latestAnchor: () =>
    api.get<LatestReadingAnchor>(`${API_ROUTES.readings}/latest-anchor`),

  compareBuildings: (params: { days: number }) =>
    api.get<CompareBuildingsResponse>(`${API_ROUTES.readings}/compare-buildings`, { params }),

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

export const userImportEndpoints = {
  downloadTemplate: () =>
    api.get<Blob>(API_ROUTES.usersImport.template, { responseType: 'blob' }),

  validate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ValidateUserImportResponse>(API_ROUTES.usersImport.validate, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listJobs: (params?: { limit?: number; offset?: number }) =>
    api.get<UserImportJobsListResponse>(API_ROUTES.usersImport.base, { params }),

  getJob: (jobId: string) =>
    api.get<UserImportJobDetailResponse>(API_ROUTES.usersImport.job(jobId)),

  getRows: (jobId: string, params?: UserImportRowsQueryParams) =>
    api.get<UserImportRowsResponse>(API_ROUTES.usersImport.rows(jobId), { params }),

  commit: (jobId: string, payload: CommitUserImportPayload) =>
    api.post<CommitUserImportResponse>(API_ROUTES.usersImport.commit(jobId), payload),

  cancel: (jobId: string) =>
    api.delete(API_ROUTES.usersImport.job(jobId)),
};

export const buildingImportEndpoints = {
  downloadTemplate: () =>
    api.get<Blob>(API_ROUTES.buildingsImport.template, { responseType: 'blob' }),

  validate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ValidateBuildingImportResponse>(API_ROUTES.buildingsImport.validate, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listJobs: (params?: { limit?: number; offset?: number }) =>
    api.get<BuildingImportJobsListResponse>(API_ROUTES.buildingsImport.base, { params }),

  getJob: (jobId: string) =>
    api.get<BuildingImportJobDetailResponse>(API_ROUTES.buildingsImport.job(jobId)),

  getRows: (jobId: string, params?: BuildingImportRowsQueryParams) =>
    api.get<BuildingImportRowsResponse>(API_ROUTES.buildingsImport.rows(jobId), { params }),

  commit: (jobId: string) =>
    api.post<CommitBuildingImportResponse>(API_ROUTES.buildingsImport.commit(jobId), {}),

  cancel: (jobId: string) =>
    api.delete(API_ROUTES.buildingsImport.job(jobId)),
};

export const tenantUnitImportEndpoints = {
  downloadTemplate: () =>
    api.get<Blob>(API_ROUTES.tenantUnitsImport.template, { responseType: 'blob' }),

  validate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ValidateTenantUnitImportResponse>(API_ROUTES.tenantUnitsImport.validate, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listJobs: (params?: { limit?: number; offset?: number }) =>
    api.get<TenantUnitImportJobsListResponse>(API_ROUTES.tenantUnitsImport.base, { params }),

  getJob: (jobId: string) =>
    api.get<TenantUnitImportJobDetailResponse>(API_ROUTES.tenantUnitsImport.job(jobId)),

  getRows: (jobId: string, params?: TenantUnitImportRowsQueryParams) =>
    api.get<TenantUnitImportRowsResponse>(API_ROUTES.tenantUnitsImport.rows(jobId), { params }),

  commit: (jobId: string) =>
    api.post<CommitTenantUnitImportResponse>(API_ROUTES.tenantUnitsImport.commit(jobId), {}),

  cancel: (jobId: string) =>
    api.delete(API_ROUTES.tenantUnitsImport.job(jobId)),
};

export const meterImportEndpoints = {
  downloadTemplate: () =>
    api.get<Blob>(API_ROUTES.metersImport.template, { responseType: 'blob' }),

  validate: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ValidateMeterImportResponse>(API_ROUTES.metersImport.validate, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listJobs: (params?: { limit?: number; offset?: number }) =>
    api.get<MeterImportJobsListResponse>(API_ROUTES.metersImport.base, { params }),

  getJob: (jobId: string) =>
    api.get<MeterImportJobDetailResponse>(API_ROUTES.metersImport.job(jobId)),

  getRows: (jobId: string, params?: MeterImportRowsQueryParams) =>
    api.get<MeterImportRowsResponse>(API_ROUTES.metersImport.rows(jobId), { params }),

  commit: (jobId: string) =>
    api.post<CommitMeterImportResponse>(API_ROUTES.metersImport.commit(jobId), {}),

  cancel: (jobId: string) =>
    api.delete(API_ROUTES.metersImport.job(jobId)),
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

export const tenantSettingsEndpoints = {
  getMyTenant: () => api.get<Tenant>(`${API_ROUTES.tenants}/me`),
  updateMyTenant: (payload: UpdateTenantPayload) => api.patch<Tenant>(`${API_ROUTES.tenants}/me`, payload),
};

export const tenantsEndpoints = {
  list: () => api.get<Tenant[]>(API_ROUTES.tenants),
  create: (payload: CreateTenantPayload) => api.post<OnboardingResult>(API_ROUTES.tenants, payload),
  get: (id: string) => api.get<Tenant>(`${API_ROUTES.tenants}/${id}`),
  update: (id: string, payload: UpdateTenantPayload) => api.patch<Tenant>(`${API_ROUTES.tenants}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.tenants}/${id}`),
};

export const apiKeysEndpoints = {
  list: () => api.get<ApiKey[]>(API_ROUTES.apiKeys),
  scopesCatalog: () => api.get<ApiKeyScopeMeta[]>(`${API_ROUTES.apiKeys}/scopes/catalog`),
  create: (payload: CreateApiKeyPayload) => api.post<ApiKeyCreationResult>(API_ROUTES.apiKeys, payload),
  update: (id: string, payload: UpdateApiKeyPayload) => api.patch<ApiKey>(`${API_ROUTES.apiKeys}/${id}`, payload),
  rotate: (id: string) => api.post<ApiKeyCreationResult>(`${API_ROUTES.apiKeys}/${id}/rotate`, {}),
  remove: (id: string) => api.delete(`${API_ROUTES.apiKeys}/${id}`),
};

export const tenantSsoEndpoints = {
  get: (tenantId: string) => api.get<TenantSsoAdminConfig | null>(API_ROUTES.tenantSso(tenantId)),
  upsert: (tenantId: string, payload: UpsertTenantSsoPayload) =>
    api.put<TenantSsoAdminConfig>(API_ROUTES.tenantSso(tenantId), payload),
};

export const oauthClientsEndpoints = {
  list: () => api.get<OAuthClient[]>(API_ROUTES.oauthClients),
  create: (payload: CreateOAuthClientPayload) =>
    api.post<OAuthClientCreationResult>(API_ROUTES.oauthClients, payload),
  update: (id: string, payload: UpdateOAuthClientPayload) =>
    api.patch<OAuthClient>(`${API_ROUTES.oauthClients}/${id}`, payload),
  rotate: (id: string) => api.post<OAuthClientCreationResult>(`${API_ROUTES.oauthClients}/${id}/rotate`, {}),
  remove: (id: string) => api.delete(`${API_ROUTES.oauthClients}/${id}`),
};

export const webhookSubscriptionsEndpoints = {
  list: (params?: WebhookSubscriptionQueryParams) =>
    api.get<WebhookSubscription[]>(API_ROUTES.webhookSubscriptions, { params }),
  create: (payload: CreateWebhookSubscriptionPayload) =>
    api.post<WebhookSubscription>(API_ROUTES.webhookSubscriptions, payload),
  update: (id: string, payload: UpdateWebhookSubscriptionPayload) =>
    api.patch<WebhookSubscription>(`${API_ROUTES.webhookSubscriptions}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.webhookSubscriptions}/${id}`),
};

export const dataQualityEndpoints = {
  report: (params: DataQualityReportParams) =>
    api.get<DataQualityReportResponse>(API_ROUTES.dataQualityReport, { params }),
  balanceAnomalies: (params?: BalanceAnomalyQueryParams) =>
    api.get<BalanceAnomaly[]>(API_ROUTES.dataQualityBalanceAnomalies, { params }),
  sloBreaches: (params?: { limit?: number }) =>
    api.get<DataSloBreach[]>(API_ROUTES.dataQualitySloBreaches, { params }),
  dataContracts: () =>
    api.get<DataContract[]>(API_ROUTES.dataQualityDataContracts),
};

export const ingestGapsEndpoints = {
  list: (params?: IngestGapListParams) =>
    api.get<IngestGapListResponse>(API_ROUTES.ingestGaps, { params }),
};

export const backfillJobsEndpoints = {
  list: () => api.get<BackfillJob[]>(API_ROUTES.backfillJobs),
  create: (payload: CreateBackfillJobPayload) =>
    api.post<BackfillJob>(API_ROUTES.backfillJobs, payload),
  process: (id: string) => api.post<BackfillJob>(API_ROUTES.backfillJobProcess(id)),
};

export const webhookDeliveryLogsEndpoints = {
  list: (params?: WebhookDeliveryLogQueryParams) =>
    api.get<WebhookDeliveryLogListResponse>(API_ROUTES.webhookDeliveryLogs, { params }),
};

export const regionsEndpoints = {
  list: () => api.get<Region[]>(API_ROUTES.regions),
  create: (payload: CreateRegionPayload) => api.post<Region>(API_ROUTES.regions, payload),
  update: (id: string, payload: UpdateRegionPayload) =>
    api.patch<Region>(`${API_ROUTES.regions}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.regions}/${id}`),
};

export const breachReportsEndpoints = {
  list: () => api.get<BreachReport[]>(API_ROUTES.breachReports),
  create: (payload: CreateBreachReportPayload) =>
    api.post<BreachReport>(API_ROUTES.breachReports, payload),
  update: (id: string, payload: UpdateBreachReportPayload) =>
    api.patch<BreachReport>(`${API_ROUTES.breachReports}/${id}`, payload),
};

export const registerMappingsEndpoints = {
  list: (params?: RegisterMappingQueryParams) =>
    api.get<RegisterMapping[]>(API_ROUTES.registerMappings, { params }),
  protocolTypes: () =>
    api.get<ProtocolType[]>(`${API_ROUTES.registerMappings}/protocol-types`),
  create: (payload: CreateRegisterMappingPayload) =>
    api.post<RegisterMapping>(API_ROUTES.registerMappings, payload),
  update: (id: string, payload: UpdateRegisterMappingPayload) =>
    api.patch<RegisterMapping>(`${API_ROUTES.registerMappings}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.registerMappings}/${id}`),
  exportCsv: (params?: RegisterMappingQueryParams) =>
    api.get<Blob>(`${API_ROUTES.registerMappings}/export`, {
      params,
      responseType: 'blob',
    }),
};

export const rolesEndpoints = {
  list: () => api.get<Role[]>(API_ROUTES.roles),
  create: (payload: CreateRolePayload) => api.post<Role>(API_ROUTES.roles, payload),
  update: (id: string, payload: UpdateRolePayload) => api.patch<Role>(`${API_ROUTES.roles}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.roles}/${id}`),
  getPermissions: (id: string) => api.get<Permission[]>(`${API_ROUTES.roles}/${id}/permissions`),
  assignPermissions: (id: string, permissionIds: string[]) =>
    api.put<Permission[]>(`${API_ROUTES.roles}/${id}/permissions`, { permissionIds }),
  permissionsCatalog: () => api.get<Permission[]>(API_ROUTES.permissions),
};

export const integrationTypesEndpoints = {
  list: () => api.get<{ type: string; label: string }[]>(API_ROUTES.supportedTypes),
};

export const platformDashboardEndpoints = {
  kpis: () => api.get<import('../types/platform-dashboard').PlatformKpis>(`${API_ROUTES.platformDashboard}/kpis`),
};
