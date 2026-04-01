export interface Building {
  id: string;
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
}

export interface UpdateBuildingPayload {
  name?: string;
  address?: string;
  areaSqm?: number;
  isActive?: boolean;
}
