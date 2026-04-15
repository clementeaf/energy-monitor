export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  maxSessionMinutes: number;
  isDefault: boolean;
  isActive: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRolePayload {
  name: string;
  slug: string;
  description?: string;
  maxSessionMinutes?: number;
  isDefault?: boolean;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  maxSessionMinutes?: number;
  isDefault?: boolean;
  isActive?: boolean;
}
