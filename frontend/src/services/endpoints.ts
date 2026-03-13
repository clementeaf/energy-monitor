import api from './api';
import { routes } from './routes';
import type { Building, Meter, MeterOverview, Reading, ConsumptionPoint, HierarchyNode, HierarchyChildSummary, HierarchyNodeWithPath, UptimeAll, DowntimeEvent, AlarmEvent, AlarmSummary, Alert, AlertStatus, AlertsSyncSummary, AdminUserAccount, RoleOption, CreateUserInvitationInput, CreateUserInvitationResult, InvitationValidationResult, BillingCenterSummary, BillingMonthlyDetail, BillingTariff } from '../types';
import type { AuthUser } from '../types/auth';

interface AlertsParams {
  status?: AlertStatus;
  type?: string;
  meterId?: string;
  buildingId?: string;
  limit?: number;
}

export const fetchBuildings = () =>
  api.get<Building[]>(routes.getBuildings()).then((r) => r.data);

export const fetchBuilding = (id: string) =>
  api.get<Building>(routes.getBuilding(id)).then((r) => r.data);

export const fetchBuildingConsumption = (buildingId: string, resolution: '15min' | 'hourly' | 'daily' = 'hourly', from?: string, to?: string) =>
  api.get<ConsumptionPoint[]>(routes.getBuildingConsumption(buildingId), { params: { resolution, from, to } }).then((r) => r.data);

export const fetchMetersOverview = () =>
  api.get<MeterOverview[]>(routes.getMetersOverview()).then((r) => r.data);

export const fetchMetersByBuilding = (buildingId: string) =>
  api.get<Meter[]>(routes.getBuildingMeters(buildingId)).then((r) => r.data);

export const fetchMeter = (meterId: string) =>
  api.get<Meter>(routes.getMeter(meterId)).then((r) => r.data);

export const fetchMeterReadings = (meterId: string, resolution: 'raw' | '15min' | 'hourly' | 'daily' = 'hourly', from?: string, to?: string) =>
  api.get<Reading[]>(routes.getMeterReadings(meterId), { params: { resolution, from, to } }).then((r) => r.data);

export const fetchMeterUptime = (meterId: string) =>
  api.get<UptimeAll>(routes.getMeterUptime(meterId)).then((r) => r.data);

export const fetchMeterDowntimeEvents = (meterId: string, from: string, to: string) =>
  api.get<DowntimeEvent[]>(routes.getMeterDowntimeEvents(meterId), { params: { from, to } }).then((r) => r.data);

export const fetchMeterAlarmEvents = (meterId: string, from: string, to: string) =>
  api.get<AlarmEvent[]>(routes.getMeterAlarmEvents(meterId), { params: { from, to } }).then((r) => r.data);

export const fetchMeterAlarmSummary = (meterId: string, from: string, to: string) =>
  api.get<AlarmSummary>(routes.getMeterAlarmSummary(meterId), { params: { from, to } }).then((r) => r.data);

// Alerts
export const fetchAlerts = (params: AlertsParams = {}) =>
  api.get<Alert[]>(routes.getAlerts(), { params }).then((r) => r.data);

export const fetchAlert = (alertId: string) =>
  api.get<Alert>(routes.getAlert(alertId)).then((r) => r.data);

export const acknowledgeAlert = (alertId: string) =>
  api.patch<Alert>(routes.acknowledgeAlert(alertId)).then((r) => r.data);

export const syncOfflineAlerts = () =>
  api.post<AlertsSyncSummary>(routes.syncOfflineAlerts()).then((r) => r.data);

// Hierarchy
export const fetchHierarchy = (buildingId: string) =>
  api.get<HierarchyNode[]>(routes.getHierarchy(buildingId)).then((r) => r.data);

export const fetchHierarchyNode = (nodeId: string) =>
  api.get<HierarchyNodeWithPath>(routes.getHierarchyNode(nodeId)).then((r) => r.data);

export const fetchHierarchyChildren = (nodeId: string, from?: string, to?: string) =>
  api.get<HierarchyChildSummary[]>(routes.getHierarchyChildren(nodeId), { params: { from, to } }).then((r) => r.data);

export const fetchHierarchyConsumption = (nodeId: string, resolution: 'hourly' | 'daily' = 'hourly', from?: string, to?: string) =>
  api.get<ConsumptionPoint[]>(routes.getHierarchyConsumption(nodeId), { params: { resolution, from, to } }).then((r) => r.data);

// Users / Roles
export const fetchAdminUsers = () =>
  api.get<AdminUserAccount[]>(routes.getAdminUsers()).then((r) => r.data);

export const createUserInvitation = (payload: CreateUserInvitationInput) =>
  api.post<CreateUserInvitationResult>(routes.getAdminUsers(), payload).then((r) => r.data);

export const fetchRoles = () =>
  api.get<RoleOption[]>(routes.getRoles()).then((r) => r.data);

export const fetchInvitation = (token: string) =>
  api.get<InvitationValidationResult>(routes.getInvitation(token)).then((r) => r.data);

// Billing
export const fetchBillingCenters = () =>
  api.get<Array<{ centerName: string }>>(routes.getBillingCenters()).then((r) => r.data);

export const fetchBillingSummary = (params?: { year?: number; centerName?: string }) =>
  api.get<BillingCenterSummary[]>(routes.getBillingSummary(), { params }).then((r) => r.data);

export const fetchBillingDetail = (params?: {
  year?: number;
  month?: number;
  centerName?: string;
  limit?: number;
  offset?: number;
}) =>
  api.get<BillingMonthlyDetail[]>(routes.getBillingDetail(), { params }).then((r) => r.data);

export const fetchBillingTariffs = (params?: { year?: number }) =>
  api.get<BillingTariff[]>(routes.getBillingTariffs(), { params }).then((r) => r.data);

// Auth
export const fetchMe = (invitationToken?: string) =>
  api.get<{ user: AuthUser; permissions: Record<string, string[]> }>(routes.getMe(), {
    headers: invitationToken ? { 'X-Invitation-Token': invitationToken } : undefined,
  }).then((r) => r.data);

export const fetchPermissions = () =>
  api.get<{ role: string; permissions: Record<string, string[]> }>(routes.getPermissions()).then((r) => r.data);
