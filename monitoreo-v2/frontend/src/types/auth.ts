export type AuthProvider = 'microsoft' | 'google';

export type Role = 'admin' | 'operator' | 'viewer' | 'technician';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  authProvider: AuthProvider;
  lastLoginAt: string | null;
}

export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface MeResponse {
  user: AuthUser;
  tenant: TenantTheme;
}
