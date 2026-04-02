import type { AuthProvider, RoleSlug } from './auth';

export interface UserListItem {
  id: string;
  email: string;
  displayName: string | null;
  authProvider: AuthProvider;
  roleId: string;
  role: {
    id: string;
    slug: RoleSlug;
    name: string;
  };
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  displayName?: string;
  authProvider: AuthProvider;
  authProviderId: string;
  roleId: string;
  buildingIds?: string[];
}

export interface UpdateUserPayload {
  displayName?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface AssignBuildingsPayload {
  buildingIds: string[];
}

export interface UserBuildingsResponse {
  buildingIds: string[];
}
