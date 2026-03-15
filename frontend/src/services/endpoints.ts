import api from './api';
import { routes } from './routes';
import type { AuthUser } from '../types/auth';
import type { Alert, BuildingSummary, BillingMonthlySummary, ComparisonFilters, ComparisonRow, DashboardBuildingMonth, MeterLatestReading, MeterListItem, MeterMonthly, MeterReading, PaymentSummary } from '../types';

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

export const fetchDashboardSummary = () =>
  api.get<DashboardBuildingMonth[]>(routes.getDashboardSummary()).then((r) => r.data);

export const fetchDashboardPayments = () =>
  api.get<PaymentSummary>(routes.getDashboardPayments()).then((r) => r.data);

export const fetchComparisonFilters = () =>
  api.get<ComparisonFilters>(routes.getComparisonFilters()).then((r) => r.data);

export const fetchComparisonByStoreType = (storeTypeIds: number[], month: string) =>
  api.get<ComparisonRow[]>(routes.getComparisonByStoreType(storeTypeIds, month)).then((r) => r.data);

export const fetchComparisonByStoreName = (storeNames: string[], month: string) =>
  api.get<ComparisonRow[]>(routes.getComparisonByStoreName(storeNames, month)).then((r) => r.data);

export const fetchAlerts = (params?: { severity?: string; meter_id?: string }) =>
  api.get<Alert[]>(routes.getAlerts(params)).then((r) => r.data);
