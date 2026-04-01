export type ReadingResolution = 'raw' | '5min' | '15min' | '1h' | '1d';
export type AggregationInterval = 'hourly' | 'daily' | 'monthly';

/** Mirrors backend ReadingRow (raw SQL — snake_case) */
export interface Reading {
  id: string;
  meter_id: string;
  timestamp: string;
  voltage_l1: string | null;
  voltage_l2: string | null;
  voltage_l3: string | null;
  current_l1: string | null;
  current_l2: string | null;
  current_l3: string | null;
  power_kw: string;
  reactive_power_kvar: string | null;
  power_factor: string | null;
  frequency_hz: string | null;
  energy_kwh_total: string;
  thd_voltage_pct: string | null;
  thd_current_pct: string | null;
  phase_imbalance_pct: string | null;
}

/** Mirrors backend LatestRow (raw SQL — snake_case) */
export interface LatestReading {
  meter_id: string;
  meter_name: string;
  building_id: string;
  timestamp: string;
  power_kw: string;
  energy_kwh_total: string;
  voltage_l1: string | null;
  current_l1: string | null;
  power_factor: string | null;
  frequency_hz: string | null;
}

export interface ReadingQueryParams {
  meterId: string;
  from: string;
  to: string;
  resolution?: ReadingResolution;
  limit?: number;
}

export interface LatestQueryParams {
  buildingId?: string;
  meterId?: string;
}

export interface AggregatedQueryParams {
  from: string;
  to: string;
  interval: AggregationInterval;
  buildingId?: string;
  meterId?: string;
}

/** Mirrors backend AggregatedRow (raw SQL — snake_case) */
export interface AggregatedReading {
  bucket: string;
  meter_id: string;
  avg_power_kw: string | null;
  max_power_kw: string | null;
  min_power_kw: string | null;
  avg_power_factor: string | null;
  avg_voltage_l1: string | null;
  energy_delta_kwh: string | null;
  reading_count: string;
}
