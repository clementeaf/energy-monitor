import api from './api';
import { routes } from './routes';
import type { Building, Meter, MeterOverview, Reading, ConsumptionPoint, HierarchyNode, HierarchyChildSummary, HierarchyNodeWithPath, UptimeAll, DowntimeEvent, AlarmEvent, AlarmSummary, Alert, AlertStatus, AlertsSyncSummary } from '../types';
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

// Auth
export const fetchMe = () =>
  api.get<{ user: AuthUser; permissions: Record<string, string[]> }>(routes.getMe()).then((r) => r.data);

export const fetchPermissions = () =>
  api.get<{ role: string; permissions: Record<string, string[]> }>(routes.getPermissions()).then((r) => r.data);
