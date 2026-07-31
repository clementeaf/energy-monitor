import api from '../api';
import { API_ROUTES } from '../routes';
import type {
  Reading, ReadingQueryParams, LatestQueryParams, LatestReading, LatestReadingAnchor,
  AggregatedQueryParams, AggregatedReading, CompareBuildingsResponse,
} from '../../types/reading';

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

// ── IoT Readings ────────────────────────────────────────

export interface IotLatestReading {
  meter_id: string;
  meter_name: string;
  variable_name: string;
  value: number;
  time: string;
}

export interface IotTimeSeriesPoint {
  time: string;
  variable_name: string;
  value: number;
}

export interface IotAlert {
  meter_id: string;
  meter_name: string;
  time: string;
  alert_type: string;
  severity: string;
  voltage_l1: number | null;
  power_factor: number | null;
}

export interface IotStats {
  reading_count: number;
  first_reading: string | null;
  last_reading: string | null;
  avg_voltage: number | null;
  avg_power_kw: number | null;
  max_power_kw: number | null;
  avg_power_factor: number | null;
  avg_frequency_hz: number | null;
}

export const iotReadingsEndpoints = {
  latest: (params?: { meterId?: string }) =>
    api.get<IotLatestReading[]>(API_ROUTES.iotReadings.latest, { params }),

  timeseries: (params: { meterId: string; from: string; to: string; variables: string; resolution?: string }) =>
    api.get<IotTimeSeriesPoint[]>(API_ROUTES.iotReadings.timeseries, { params }),

  readings: (params: { meterId: string; from: string; to: string; limit?: number }) =>
    api.get(API_ROUTES.iotReadings.base, { params }),

  alerts: (params?: { meterId?: string; severity?: string }) =>
    api.get<IotAlert[]>(API_ROUTES.iotReadings.alerts, { params }),

  stats: (params: { meterId: string; from: string; to: string }) =>
    api.get<IotStats>(API_ROUTES.iotReadings.stats, { params }),
};
