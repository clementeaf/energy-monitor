export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  accentColor: string;
  appTitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  timezone: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantPayload {
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  sidebarColor?: string;
  accentColor?: string;
  appTitle?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  timezone?: string;
  settings?: Record<string, unknown>;
}
