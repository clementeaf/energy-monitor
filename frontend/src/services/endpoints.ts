import api from './api';
import { routes } from './routes';
import type { BuildingSummary, BillingMonthlySummary, MeterListItem, MeterMonthly, MeterReading } from '../types';

export const fetchBuildings = () =>
  api.get<BuildingSummary[]>(routes.getBuildings()).then((r) => r.data);

export const fetchBuilding = (name: string) =>
  api.get<BuildingSummary[]>(routes.getBuilding(name)).then((r) => r.data);

export const fetchMetersByBuilding = (buildingName: string) =>
  api.get<MeterListItem[]>(routes.getMetersByBuilding(buildingName)).then((r) => r.data);

export const fetchMeterMonthly = (meterId: string) =>
  api.get<MeterMonthly[]>(routes.getMeterMonthly(meterId)).then((r) => r.data);

export const fetchMeterReadings = (meterId: string, from: string, to: string) =>
  api.get<MeterReading[]>(routes.getMeterReadings(meterId, from, to)).then((r) => r.data);

export const fetchBilling = (buildingName: string) =>
  api.get<BillingMonthlySummary[]>(routes.getBilling(buildingName)).then((r) => r.data);
