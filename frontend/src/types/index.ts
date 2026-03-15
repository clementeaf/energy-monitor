// Matches backend billing aggregated response
export interface BillingMonthlySummary {
  month: string;
  totalMeters: number;
  totalKwh: number | null;
  energiaClp: number | null;
  ddaMaxKw: number | null;
  ddaMaxPuntaKw: number | null;
  kwhTroncal: number | null;
  kwhServPublico: number | null;
  cargoFijoClp: number | null;
  totalNetoClp: number | null;
  ivaClp: number | null;
  montoExentoClp: number | null;
  totalConIvaClp: number | null;
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

// Matches backend MeterLatestReading (latest reading per meter)
export interface MeterLatestReading {
  meterId: string;
  storeName: string;
  powerKw: number | null;
  voltageL1: number | null;
  currentL1: number | null;
  powerFactor: number | null;
  timestamp: string;
}

// Matches backend Alert entity (alerts table)
export interface Alert {
  id: number;
  meterId: string;
  timestamp: string;
  alertType: string;
  severity: string;
  field: string;
  value: number | null;
  threshold: number | null;
  message: string | null;
  createdAt: string;
}

// Matches backend dashboard/summary endpoint
export interface DashboardBuildingMonth {
  buildingName: string;
  month: string;
  totalKwh: number | null;
  totalConIvaClp: number | null;
  totalMeters: number;
  areaSqm: number | null;
}

// Matches backend comparisons endpoints
export interface ComparisonRow {
  buildingName: string;
  totalKwh: number | null;
  totalConIvaClp: number | null;
  totalMeters: number;
}

export interface ComparisonFilters {
  storeTypes: { id: number; name: string }[];
  storeNames: string[];
  months: string[];
}

// Matches backend dashboard/payments endpoint
export interface OverdueBucket {
  range: string;
  count: number;
  totalClp: number;
}

export interface PaymentSummary {
  pagosRecibidos: { count: number; totalClp: number };
  porVencer: { count: number; totalClp: number };
  vencidos: { count: number; totalClp: number };
  vencidosPorPeriodo: OverdueBucket[];
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
  totalKwh: number | null;
  totalPowerKw: number | null;
  avgPowerKw: number | null;
  peakPowerKw: number | null;
  totalReactiveKvar: number | null;
  avgPowerFactor: number | null;
  peakDemandKw: number | null;
}
