import api from './api';
import { routes } from './routes';
import type { Building, Local, MonthlyConsumption } from '../types';
import type { AuthUser } from '../types/auth';

export const fetchBuildings = () =>
  api.get<Building[]>(routes.getBuildings()).then((r) => r.data);

export const fetchBuilding = (id: string) =>
  api.get<Building>(routes.getBuilding(id)).then((r) => r.data);

export const fetchBuildingConsumption = (buildingId: string) =>
  api.get<MonthlyConsumption[]>(routes.getBuildingConsumption(buildingId)).then((r) => r.data);

export const fetchLocalsByBuilding = (buildingId: string) =>
  api.get<Local[]>(routes.getBuildingLocals(buildingId)).then((r) => r.data);

export const fetchLocal = (localId: string) =>
  api.get<Local>(routes.getLocal(localId)).then((r) => r.data);

export const fetchConsumption = (localId: string) =>
  api.get<MonthlyConsumption[]>(routes.getLocalConsumption(localId)).then((r) => r.data);

// Auth
export const fetchMe = () =>
  api.get<{ user: AuthUser; permissions: Record<string, string[]> }>(routes.getMe()).then((r) => r.data);

export const fetchPermissions = () =>
  api.get<{ role: string; permissions: Record<string, string[]> }>(routes.getPermissions()).then((r) => r.data);
