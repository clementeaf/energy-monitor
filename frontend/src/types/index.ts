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

// Matches backend MeterReading entity (meter_readings table)
export interface MeterReading {
  meterId: string;
  timestamp: string;
  voltageL1: number | null;
  voltageL2: number | null;
  voltageL3: number | null;
  currentL1: number | null;
  currentL2: number | null;
  currentL3: number | null;
  powerKw: number | null;
  reactivePowerKvar: number | null;
  powerFactor: number | null;
  frequencyHz: number | null;
  energyKwhTotal: number | null;
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
