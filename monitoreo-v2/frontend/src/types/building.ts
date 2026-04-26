export interface Building {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string | null;
  areaSqm: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuildingPayload {
  name: string;
  code: string;
  address?: string;
  areaSqm?: number;
  tenantId?: string;
}

export interface UpdateBuildingPayload {
  name?: string;
  address?: string;
  areaSqm?: number;
  isActive?: boolean;
}
