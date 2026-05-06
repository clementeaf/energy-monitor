export type AuthProvider = 'microsoft' | 'google';

export type RoleSlug =
  | 'super_admin'
  | 'corp_admin'
  | 'site_admin'
  | 'operator'
  | 'analyst'
  | 'tenant_user'
  | 'auditor';

export interface UserRole {
  id: string;
  slug: RoleSlug;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  permissions: string[]; // "module:action" strings
  buildingIds: string[]; // UUIDs from user_building_access (empty = all buildings)
  authProvider: AuthProvider;
  lastLoginAt: string | null;
  privacyAccepted: boolean;
  requireMfaSetup: boolean;
  dataProcessingBlocked: boolean;
  optOutAutomatedDecisions: boolean;
}

export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  accentColor: string;
  appTitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface BuildingRef {
  id: string;
  name: string;
}

export interface MeResponse {
  user: AuthUser & { buildings: BuildingRef[] };
  tenant: TenantTheme;
}
