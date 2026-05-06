import { lazy } from 'react';

export const LazyLoginPage = lazy(async () => {
  const m = await import('../features/auth/LoginPage');
  return { default: m.LoginPage };
});

export const LazyDashboardPage = lazy(async () => {
  const m = await import('../features/dashboard/DashboardPage');
  return { default: m.DashboardPage };
});

export const LazyPlatformDashboardPage = lazy(async () => {
  const m = await import('../features/dashboard/platform/PlatformDashboardPage');
  return { default: m.PlatformDashboardPage };
});

export const LazyExecutiveDashboardPage = lazy(async () => {
  const m = await import('../features/dashboard/executive/ExecutiveDashboardPage');
  return { default: m.ExecutiveDashboardPage };
});

export const LazyExecutiveSitePage = lazy(async () => {
  const m = await import('../features/dashboard/executive/ExecutiveSitePage');
  return { default: m.ExecutiveSitePage };
});

export const LazyCompareDashboardPage = lazy(async () => {
  const m = await import('../features/dashboard/compare/CompareDashboardPage');
  return { default: m.CompareDashboardPage };
});

export const LazyBuildingsPage = lazy(async () => {
  const m = await import('../features/buildings/BuildingsPage');
  return { default: m.BuildingsPage };
});

export const LazyMetersPage = lazy(async () => {
  const m = await import('../features/meters/MetersPage');
  return { default: m.MetersPage };
});

export const LazyAlertsPage = lazy(async () => {
  const m = await import('../features/alerts/AlertsPage');
  return { default: m.AlertsPage };
});

export const LazyComponentsPage = lazy(async () => {
  const m = await import('../features/components/ComponentsPage');
  return { default: m.ComponentsPage };
});

export const LazyRealtimePage = lazy(async () => {
  const m = await import('../features/monitoring/realtime/RealtimePage');
  return { default: m.RealtimePage };
});

export const LazyDrilldownPage = lazy(async () => {
  const m = await import('../features/monitoring/drilldown/DrilldownPage');
  return { default: m.DrilldownPage };
});

export const LazyDemandPage = lazy(async () => {
  const m = await import('../features/monitoring/demand/DemandPage');
  return { default: m.DemandPage };
});

export const LazyQualityPage = lazy(async () => {
  const m = await import('../features/monitoring/quality/QualityPage');
  return { default: m.QualityPage };
});

export const LazyDevicesPage = lazy(async () => {
  const m = await import('../features/monitoring/devices/DevicesPage');
  return { default: m.DevicesPage };
});

export const LazyFaultHistoryPage = lazy(async () => {
  const m = await import('../features/monitoring/fault-history/FaultHistoryPage');
  return { default: m.FaultHistoryPage };
});

export const LazyMetersByTypePage = lazy(async () => {
  const m = await import('../features/monitoring/meters-by-type/MetersByTypePage');
  return { default: m.MetersByTypePage };
});

export const LazyGenerationSitePage = lazy(async () => {
  const m = await import('../features/monitoring/generation/GenerationSitePage');
  return { default: m.GenerationSitePage };
});

export const LazyModbusMapPage = lazy(async () => {
  const m = await import('../features/monitoring/modbus-map/ModbusMapPage');
  return { default: m.ModbusMapPage };
});

export const LazyConcentratorPage = lazy(async () => {
  const m = await import('../features/monitoring/concentrator/ConcentratorPage');
  return { default: m.ConcentratorPage };
});

export const LazyInvoicesPage = lazy(async () => {
  const m = await import('../features/billing/InvoicesPage');
  return { default: m.InvoicesPage };
});

export const LazyBillingHistoryPage = lazy(async () => {
  const m = await import('../features/billing/InvoicesPage');
  return { default: () => m.InvoicesPage({ defaultStatus: 'history' }) };
});

export const LazyBillingApprovePage = lazy(async () => {
  const m = await import('../features/billing/InvoicesPage');
  return { default: () => m.InvoicesPage({ defaultStatus: 'pending' }) };
});

export const LazyMyInvoicePage = lazy(async () => {
  const m = await import('../features/billing/MyInvoicePage');
  return { default: m.MyInvoicePage };
});

export const LazyTariffsPage = lazy(async () => {
  const m = await import('../features/billing/TariffsPage');
  return { default: m.TariffsPage };
});

export const LazyReportsPage = lazy(async () => {
  const m = await import('../features/reports/ReportsPage');
  return { default: m.ReportsPage };
});

export const LazyIntegrationsPage = lazy(async () => {
  const m = await import('../features/integrations/IntegrationsPage');
  return { default: m.IntegrationsPage };
});

export const LazyBenchmarkPage = lazy(async () => {
  const m = await import('../features/analytics/BenchmarkPage');
  return { default: m.BenchmarkPage };
});

export const LazyTrendsPage = lazy(async () => {
  const m = await import('../features/analytics/TrendsPage');
  return { default: m.TrendsPage };
});

export const LazyPatternsPage = lazy(async () => {
  const m = await import('../features/analytics/PatternsPage');
  return { default: m.PatternsPage };
});

export const LazyPlaceholderPage = lazy(async () => {
  const m = await import('../features/placeholder/PlaceholderPage');
  return { default: m.PlaceholderPage };
});

export const LazyUsersPage = lazy(async () => {
  const m = await import('../features/admin/users/UsersPage');
  return { default: m.UsersPage };
});

export const LazyTenantsPage = lazy(async () => {
  const m = await import('../features/admin/tenants/TenantsPage');
  return { default: m.TenantsPage };
});

export const LazyHierarchyPage = lazy(async () => {
  const m = await import('../features/admin/hierarchy/HierarchyPage');
  return { default: m.HierarchyPage };
});

export const LazyAuditPage = lazy(async () => {
  const m = await import('../features/admin/audit/AuditPage');
  return { default: m.AuditPage };
});

export const LazyAuditChangesPage = lazy(async () => {
  const m = await import('../features/admin/audit/AuditPage');
  return { default: () => m.AuditPage({ mode: 'changes' }) };
});

export const LazyAuditAccessPage = lazy(async () => {
  const m = await import('../features/admin/audit/AuditPage');
  return { default: () => m.AuditPage({ mode: 'access' }) };
});

export const LazyAlertsHistoryPage = lazy(async () => {
  const m = await import('../features/alerts/AlertsHistoryPage');
  return { default: m.AlertsHistoryPage };
});

export const LazyAlertRulesPage = lazy(async () => {
  const m = await import('../features/alerts/AlertRulesPage');
  return { default: m.AlertRulesPage };
});

export const LazyEscalationPage = lazy(async () => {
  const m = await import('../features/alerts/EscalationPage');
  return { default: m.EscalationPage };
});

export const LazyNotificationsPage = lazy(async () => {
  const m = await import('../features/alerts/NotificationsPage');
  return { default: m.NotificationsPage };
});

export const LazyTenantSettingsPage = lazy(async () => {
  const m = await import('../features/admin/settings/TenantSettingsPage');
  return { default: m.TenantSettingsPage };
});

export const LazyApiKeysPage = lazy(async () => {
  const m = await import('../features/admin/api-keys/ApiKeysPage');
  return { default: m.ApiKeysPage };
});

export const LazyRolesPage = lazy(async () => {
  const m = await import('../features/admin/roles/RolesPage');
  return { default: m.RolesPage };
});

export const LazyCompaniesPage = lazy(async () => {
  const m = await import('../features/admin/companies/CompaniesPage');
  return { default: m.CompaniesPage };
});

export const LazyBuildingDetailPage = lazy(async () => {
  const m = await import('../features/buildings/BuildingDetailPage');
  return { default: m.BuildingDetailPage };
});

export const LazyMeterDetailPage = lazy(async () => {
  const m = await import('../features/monitoring/meter-detail/MeterDetailPage');
  return { default: m.MeterDetailPage };
});

export const LazyMeterReadingsPage = lazy(async () => {
  const m = await import('../features/monitoring/meter-readings/MeterReadingsPage');
  return { default: m.MeterReadingsPage };
});

export const LazyPrivacyPolicyPage = lazy(async () => {
  const m = await import('../features/privacy/PrivacyPolicyPage');
  return { default: m.PrivacyPolicyPage };
});

export const LazyDeletionRequestsPage = lazy(async () => {
  const m = await import('../features/admin/deletion-requests/DeletionRequestsPage');
  return { default: m.DeletionRequestsPage };
});

export const LazyProfilePage = lazy(async () => {
  const m = await import('../features/profile/ProfilePage');
  return { default: m.ProfilePage };
});
