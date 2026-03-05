import api from './api';
import { routes } from './routes';
import type { Building, Meter, Reading, ConsumptionPoint } from '../types';
import type { AuthUser } from '../types/auth';

export const fetchBuildings = () =>
  api.get<Building[]>(routes.getBuildings()).then((r) => r.data);

export const fetchBuilding = (id: string) =>
  api.get<Building>(routes.getBuilding(id)).then((r) => r.data);

export const fetchBuildingConsumption = (buildingId: string, resolution: 'hourly' | 'daily' = 'hourly') =>
  api.get<ConsumptionPoint[]>(routes.getBuildingConsumption(buildingId), { params: { resolution } }).then((r) => r.data);

export const fetchMetersByBuilding = (buildingId: string) =>
  api.get<Meter[]>(routes.getBuildingMeters(buildingId)).then((r) => r.data);

export const fetchMeter = (meterId: string) =>
  api.get<Meter>(routes.getMeter(meterId)).then((r) => r.data);

export const fetchMeterReadings = (meterId: string, resolution: 'raw' | 'hourly' | 'daily' = 'hourly') =>
  api.get<Reading[]>(routes.getMeterReadings(meterId), { params: { resolution } }).then((r) => r.data);

// Auth
export const fetchMe = () =>
  api.get<{ user: AuthUser; permissions: Record<string, string[]> }>(routes.getMe()).then((r) => r.data);

export const fetchPermissions = () =>
  api.get<{ role: string; permissions: Record<string, string[]> }>(routes.getPermissions()).then((r) => r.data);
