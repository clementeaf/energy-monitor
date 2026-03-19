import api from './api';
import { routes } from './routes';
import type { AuthUser } from '../types/auth';
import type { Alert, BillingDocumentDetail, BillingStoreBreakdown, BuildingSummary, BillingMonthlySummary, ComparisonFilters, ComparisonRow, ComparisonStoreRow, ComparisonTypeRow, DashboardBuildingMonth, MeterLatestReading, MeterListItem, MeterMonthly, MeterReading, OperatorSummary, PaymentSummary, StoreItem } from '../types';

interface MeResponse {
  user: AuthUser;
  permissions: Record<string, string[]>;
}

interface PermissionsResponse {
  role: string;
  permissions: Record<string, string[]>;
}

export const fetchMe = (invitationToken?: string) =>
  api.get<MeResponse>(routes.getMe(), {
    headers: invitationToken ? { 'x-invitation-token': invitationToken } : undefined,
  }).then((r) => r.data);

export const fetchPermissions = () =>
  api.get<PermissionsResponse>(routes.getPermissions()).then((r) => r.data);

export const fetchBuildings = () =>
  api.get<BuildingSummary[]>(routes.getBuildings()).then((r) => r.data);

export const fetchBuilding = (name: string) =>
  api.get<BuildingSummary[]>(routes.getBuilding(name)).then((r) => r.data);

export const fetchMeterInfo = (meterId: string) =>
  api.get<{ meterId: string; storeName: string; buildingName: string | null }>(routes.getMeterInfo(meterId)).then((r) => r.data);

export const fetchMetersByBuilding = (buildingName: string) =>
  api.get<MeterListItem[]>(routes.getMetersByBuilding(buildingName)).then((r) => r.data);

export const fetchMetersLatest = (buildingName: string) =>
  api.get<MeterLatestReading[]>(routes.getMetersLatest(buildingName)).then((r) => r.data);

export const fetchMeterMonthly = (meterId: string) =>
  api.get<MeterMonthly[]>(routes.getMeterMonthly(meterId)).then((r) => r.data);

export const fetchMeterReadings = (meterId: string, from: string, to: string) =>
  api.get<MeterReading[]>(routes.getMeterReadings(meterId, from, to)).then((r) => r.data);

export const fetchBilling = (buildingName: string) =>
  api.get<BillingMonthlySummary[]>(routes.getBilling(buildingName)).then((r) => r.data);

export const fetchBillingStores = (buildingName: string, month: string) =>
  api.get<BillingStoreBreakdown[]>(routes.getBillingStores(buildingName, month)).then((r) => r.data);

export const fetchDashboardSummary = () =>
  api.get<DashboardBuildingMonth[]>(routes.getDashboardSummary()).then((r) => r.data);

export const fetchDashboardPayments = () =>
  api.get<PaymentSummary>(routes.getDashboardPayments()).then((r) => r.data);

export const fetchDashboardDocuments = (status: string) =>
  api.get<BillingDocumentDetail[]>(routes.getDashboardDocuments(status)).then((r) => r.data);

export const fetchComparisonFilters = (buildingNames?: string[]) =>
  api.get<ComparisonFilters>(routes.getComparisonFilters(buildingNames)).then((r) => r.data);

export const fetchComparisonByStore = (month: string, buildingNames?: string[], storeTypeIds?: number[], storeNames?: string[]) =>
  api.get<ComparisonStoreRow[]>(routes.getComparisonByStore(month, buildingNames, storeTypeIds, storeNames)).then((r) => r.data);

export const fetchComparisonGroupedByType = (month: string, buildingNames?: string[]) =>
  api.get<ComparisonTypeRow[]>(routes.getComparisonGroupedByType(month, buildingNames)).then((r) => r.data);

export const fetchComparisonByStoreType = (storeTypeIds: number[], month: string) =>
  api.get<ComparisonRow[]>(routes.getComparisonByStoreType(storeTypeIds, month)).then((r) => r.data);

export const fetchComparisonByStoreName = (storeNames: string[], month: string) =>
  api.get<ComparisonRow[]>(routes.getComparisonByStoreName(storeNames, month)).then((r) => r.data);

export const fetchStores = () =>
  api.get<StoreItem[]>(routes.getStores()).then((r) => r.data);

export const fetchStoreTypes = () =>
  api.get<{ id: number; name: string }[]>(routes.getStoreTypes()).then((r) => r.data);

export const fetchAlerts = (params?: { severity?: string; meter_id?: string }) =>
  api.get<Alert[]>(routes.getAlerts(params)).then((r) => r.data);

export const fetchBillingPdf = (storeName: string, buildingName: string, month: string) =>
  api.get<Blob>(routes.getBillingPdf(storeName, buildingName, month), { responseType: 'blob' }).then((r) => r.data);

// --- Admin users ---

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roleId: number;
  role: string;
  roleLabel: string;
  provider: 'microsoft' | 'google' | null;
  isActive: boolean;
  siteIds: string[];
  invitationStatus: 'invited' | 'active' | 'disabled' | 'expired';
  invitationExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvitationInput {
  email: string;
  name: string;
  roleId: number;
  siteIds: string[];
  userMode?: string;
}

export interface CreateInvitationResult extends AdminUser {
  invitationToken: string;
}

export const fetchUsers = () =>
  api.get<AdminUser[]>(routes.getUsers()).then((r) => r.data);

export const createInvitation = (data: CreateInvitationInput) =>
  api.post<CreateInvitationResult>(routes.createUser(), data).then((r) => r.data);

export const createDirectUser = (data: CreateInvitationInput) =>
  api.post<AdminUser>(routes.createDirectUser(), data).then((r) => r.data);

export const deleteUsers = (ids: string[]) =>
  api.delete<{ deleted: number }>(routes.deleteUsers(), { data: { ids } }).then((r) => r.data);

export const resendInvitation = (userId: string) =>
  api.post<{ sent: boolean }>(routes.resendInvitation(userId)).then((r) => r.data);

// --- Invitations ---

export interface InvitationValidation {
  email: string;
  name: string;
  role: string;
  roleLabel: string;
  invitationStatus: 'invited' | 'active' | 'disabled' | 'expired';
  invitationExpiresAt: string | null;
}

export const validateInvitation = (token: string) =>
  api.get<InvitationValidation>(routes.validateInvitation(token)).then((r) => r.data);

// --- Building mutations ---

export const createBuilding = (data: { buildingName: string; areaSqm: number }) =>
  api.post<BuildingSummary>(routes.createBuilding(), data).then((r) => r.data);

export const updateBuilding = (name: string, data: { areaSqm?: number }) =>
  api.patch(routes.updateBuilding(name), data).then((r) => r.data);

export const deleteBuilding = (name: string) =>
  api.delete(routes.deleteBuilding(name)).then((r) => r.data);

// --- Operator endpoints ---

export const fetchOperators = (buildingName: string) =>
  api.get<OperatorSummary[]>(routes.getOperators(buildingName)).then((r) => r.data);

export const renameOperator = (buildingName: string, operatorName: string, newName: string) =>
  api.patch(routes.renameOperator(buildingName, operatorName), { newName }).then((r) => r.data);

export const deleteOperator = (buildingName: string, operatorName: string) =>
  api.delete(routes.deleteOperator(buildingName, operatorName)).then((r) => r.data);

// --- Store mutations ---

export interface BulkStoreItem {
  meterId: string;
  storeName: string;
  storeTypeName: string;
  buildingName: string;
}

export interface BulkCreateResult {
  successCount: number;
  errors: { row: number; meterId: string; error: string }[];
}

export const bulkCreateStores = (items: BulkStoreItem[]) =>
  api.post<BulkCreateResult>(routes.bulkCreateStores(), { items }).then((r) => r.data);

export const createStore = (data: { meterId: string; storeName: string; storeTypeId: number; buildingName: string }) =>
  api.post<StoreItem>(routes.createStore(), data).then((r) => r.data);

export const updateStore = (meterId: string, data: { storeName?: string; storeTypeId?: number }) =>
  api.patch(routes.updateStore(meterId), data).then((r) => r.data);

export const deleteStore = (meterId: string) =>
  api.delete(routes.deleteStore(meterId)).then((r) => r.data);
