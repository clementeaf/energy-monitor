export interface Building {
  id: string;
  name: string;
  address: string;
  totalArea: number;
  localsCount: number;
}

export interface Local {
  id: string;
  buildingId: string;
  name: string;
  floor: number;
  area: number;
  type: string;
}

export interface MonthlyConsumption {
  month: string;
  consumption: number;
  unit: string;
}
