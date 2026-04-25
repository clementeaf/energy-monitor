export interface TenantSummary {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  buildings: number;
  meters: number;
  activeAlerts: number;
}

export interface PlatformKpis {
  tenants: number;
  buildings: number;
  meters: number;
  readings: number;
  activeAlerts: number;
  onlineMeters: number;
  offlineMeters: number;
  tenantSummaries: TenantSummary[];
}
