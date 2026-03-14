// Matches backend billing aggregated response
export interface BillingMonthlySummary {
  month: string;
  totalMeters: number;
  totalKwh: number;
  energiaClp: number;
  ddaMaxKw: number;
  ddaMaxPuntaKw: number;
  kwhTroncal: number;
  kwhServPublico: number;
  cargoFijoClp: number;
  totalNetoClp: number;
  ivaClp: number;
  montoExentoClp: number;
  totalConIvaClp: number;
}

// Matches backend meters list response
export interface MeterListItem {
  meterId: string;
  storeName: string;
  storeType: string;
}

// Matches backend MeterMonthly entity (meter_monthly table)
export interface MeterMonthly {
  meterId: string;
  month: string;
  totalKwh: number | null;
  avgPowerKw: number | null;
  peakPowerKw: number | null;
  totalReactiveKvar: number | null;
  avgPowerFactor: number | null;
}

// Matches backend BuildingSummary entity (building_summary table)
export interface BuildingSummary {
  buildingName: string;
  month: string;
  totalStores: number;
  storeTypes: number;
  totalMeters: number;
  assignedMeters: number;
  unassignedMeters: number;
  areaSqm: number | null;
  totalKwh: number;
  totalPowerKw: number;
  avgPowerKw: number;
  peakPowerKw: number;
  totalReactiveKvar: number;
  avgPowerFactor: number;
  peakDemandKw: number;
}
