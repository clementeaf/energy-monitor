export interface Tariff {
  id: string;
  tenantId: string;
  buildingId: string;
  name: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TariffBlock {
  id: string;
  tariffId: string;
  blockName: string;
  hourStart: number;
  hourEnd: number;
  energyRate: string;
  demandRate: string;
  reactiveRate: string;
  fixedCharge: string;
}

export interface CreateTariffPayload {
  buildingId: string;
  name: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface UpdateTariffPayload {
  name?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
}

export interface CreateTariffBlockPayload {
  blockName: string;
  hourStart: number;
  hourEnd: number;
  energyRate: number;
  demandRate?: number;
  reactiveRate?: number;
  fixedCharge?: number;
}
