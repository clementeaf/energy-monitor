export interface TenantUnit {
  id: string;
  buildingId: string;
  name: string;
  unitCode: string;
  contactName: string | null;
  contactEmail: string | null;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantUnitPayload {
  buildingId: string;
  name: string;
  unitCode: string;
  contactName?: string;
  contactEmail?: string;
  userId?: string;
}

export interface UpdateTenantUnitPayload {
  name?: string;
  unitCode?: string;
  contactName?: string;
  contactEmail?: string;
  userId?: string;
  isActive?: boolean;
}

export interface TenantUnitMeter {
  tenantUnitId: string;
  meterId: string;
}
