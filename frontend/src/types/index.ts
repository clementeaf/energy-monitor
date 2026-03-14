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
