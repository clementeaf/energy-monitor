import api from './api';
import { routes } from './routes';
import type { BuildingSummary, BillingMonthlySummary, MeterListItem } from '../types';

export const fetchBuildings = () =>
  api.get<BuildingSummary[]>(routes.getBuildings()).then((r) => r.data);

export const fetchBuilding = (name: string) =>
  api.get<BuildingSummary[]>(routes.getBuilding(name)).then((r) => r.data);

export const fetchMetersByBuilding = (buildingName: string) =>
  api.get<MeterListItem[]>(routes.getMetersByBuilding(buildingName)).then((r) => r.data);

export const fetchBilling = (buildingName: string) =>
  api.get<BillingMonthlySummary[]>(routes.getBilling(buildingName)).then((r) => r.data);
