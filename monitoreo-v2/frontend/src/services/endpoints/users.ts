import api from '../api';
import { API_ROUTES } from '../routes';
import type {
  UserListItem, CreateUserPayload, UpdateUserPayload,
  AssignBuildingsPayload, UserBuildingsResponse,
} from '../../types/user';
import type { Role, Permission, CreateRolePayload, UpdateRolePayload } from '../../types/role';
import type { Tenant, CreateTenantPayload, OnboardingResult, UpdateTenantPayload } from '../../types/tenant';
import type { ApiKey, ApiKeyCreationResult, ApiKeyScopeMeta, CreateApiKeyPayload, UpdateApiKeyPayload } from '../../types/api-key';
import type {
  OAuthClient,
  OAuthClientCreationResult,
  CreateOAuthClientPayload,
  UpdateOAuthClientPayload,
} from '../../types/oauth-client';

export const usersEndpoints = {
  list: () =>
    api.get<UserListItem[]>(API_ROUTES.users),

  get: (id: string) =>
    api.get<UserListItem>(`${API_ROUTES.users}/${id}`),

  create: (payload: CreateUserPayload) =>
    api.post<UserListItem>(API_ROUTES.users, payload),

  update: (id: string, payload: UpdateUserPayload) =>
    api.patch<UserListItem>(`${API_ROUTES.users}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.users}/${id}`),

  getBuildingIds: (id: string) =>
    api.get<UserBuildingsResponse>(`${API_ROUTES.users}/${id}/buildings`),

  assignBuildings: (id: string, payload: AssignBuildingsPayload) =>
    api.patch<UserBuildingsResponse>(`${API_ROUTES.users}/${id}/buildings`, payload),
};

export const rolesEndpoints = {
  list: () => api.get<Role[]>(API_ROUTES.roles),
  create: (payload: CreateRolePayload) => api.post<Role>(API_ROUTES.roles, payload),
  update: (id: string, payload: UpdateRolePayload) => api.patch<Role>(`${API_ROUTES.roles}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.roles}/${id}`),
  getPermissions: (id: string) => api.get<Permission[]>(`${API_ROUTES.roles}/${id}/permissions`),
  assignPermissions: (id: string, permissionIds: string[]) =>
    api.put<Permission[]>(`${API_ROUTES.roles}/${id}/permissions`, { permissionIds }),
  permissionsCatalog: () => api.get<Permission[]>(API_ROUTES.permissions),
};

export const tenantsEndpoints = {
  list: () => api.get<Tenant[]>(API_ROUTES.tenants),
  create: (payload: CreateTenantPayload) => api.post<OnboardingResult>(API_ROUTES.tenants, payload),
  get: (id: string) => api.get<Tenant>(`${API_ROUTES.tenants}/${id}`),
  update: (id: string, payload: UpdateTenantPayload) => api.patch<Tenant>(`${API_ROUTES.tenants}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.tenants}/${id}`),
};

export const tenantSettingsEndpoints = {
  getMyTenant: () => api.get<Tenant>(`${API_ROUTES.tenants}/me`),
  updateMyTenant: (payload: UpdateTenantPayload) => api.patch<Tenant>(`${API_ROUTES.tenants}/me`, payload),
};

export const apiKeysEndpoints = {
  list: () => api.get<ApiKey[]>(API_ROUTES.apiKeys),
  scopesCatalog: () => api.get<ApiKeyScopeMeta[]>(`${API_ROUTES.apiKeys}/scopes/catalog`),
  create: (payload: CreateApiKeyPayload) => api.post<ApiKeyCreationResult>(API_ROUTES.apiKeys, payload),
  update: (id: string, payload: UpdateApiKeyPayload) => api.patch<ApiKey>(`${API_ROUTES.apiKeys}/${id}`, payload),
  rotate: (id: string) => api.post<ApiKeyCreationResult>(`${API_ROUTES.apiKeys}/${id}/rotate`, {}),
  remove: (id: string) => api.delete(`${API_ROUTES.apiKeys}/${id}`),
};

export const oauthClientsEndpoints = {
  list: () => api.get<OAuthClient[]>(API_ROUTES.oauthClients),
  create: (payload: CreateOAuthClientPayload) =>
    api.post<OAuthClientCreationResult>(API_ROUTES.oauthClients, payload),
  update: (id: string, payload: UpdateOAuthClientPayload) =>
    api.patch<OAuthClient>(`${API_ROUTES.oauthClients}/${id}`, payload),
  rotate: (id: string) => api.post<OAuthClientCreationResult>(`${API_ROUTES.oauthClients}/${id}/rotate`, {}),
  remove: (id: string) => api.delete(`${API_ROUTES.oauthClients}/${id}`),
};
