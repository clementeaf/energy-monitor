export type AuthProvider = 'microsoft' | 'google' | 'demo';

export type Role =
  | 'SUPER_ADMIN'
  | 'CORP_ADMIN'
  | 'SITE_ADMIN'
  | 'OPERATOR'
  | 'ANALYST'
  | 'TENANT_USER'
  | 'AUDITOR';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  provider: AuthProvider;
  avatar?: string;
  siteIds: string[];
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
