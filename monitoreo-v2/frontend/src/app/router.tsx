import { createBrowserRouter, Outlet } from 'react-router';
import { SessionGate } from '../components/auth/SessionGate';
import { LayoutShell } from '../components/layout/LayoutShell';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RequirePerms } from '../components/auth/RequirePerms';
import { LoginRouteShell } from '../components/routing/LoginRouteShell';
import {
  LazyBuildingsPage,
  LazyMetersPage,
  LazyAlertsPage,
  LazyComponentsPage,
  LazyDashboardPage,
  LazyExecutiveDashboardPage,
  LazyExecutiveSitePage,
  LazyCompareDashboardPage,
  LazyRealtimePage,
  LazyDrilldownPage,
  LazyDemandPage,
  LazyQualityPage,
  LazyDevicesPage,
  LazyFaultHistoryPage,
  LazyInvoicesPage,
  LazyBillingHistoryPage,
  LazyBillingApprovePage,
  LazyMyInvoicePage,
  LazyTariffsPage,
  LazyReportsPage,
  LazyBenchmarkPage,
  LazyTrendsPage,
  LazyPatternsPage,
  LazyIntegrationsPage,
  LazyUsersPage,
  LazyTenantsPage,
  LazyHierarchyPage,
  LazyAuditPage,
  LazyAuditChangesPage,
  LazyAuditAccessPage,
  LazyAlertsHistoryPage,
  LazyAlertRulesPage,
  LazyEscalationPage,
  LazyNotificationsPage,
  LazyMetersByTypePage,
  LazyGenerationSitePage,
  LazyModbusMapPage,
  LazyConcentratorPage,
  LazyTenantSettingsPage,
  LazyApiKeysPage,
  LazyRolesPage,
} from './lazyPages';
import { APP_ROUTES } from './routes';

/* ── Permission shorthands ── */
const DASH_EXEC = ['dashboard_executive:read'];
const DASH_TECH = ['dashboard_technical:read'];
const DASH_ANY = ['dashboard_executive:read', 'dashboard_technical:read'];
const MONITORING = ['dashboard_technical:read', 'dashboard_executive:read', 'readings:read'];
const DEVICES = ['diagnostics:read', 'admin_meters:read'];
const FAULTS = ['monitoring_faults:read'];
const ALERTS = ['alerts:read'];
const BILLING_READ = ['billing:read', 'billing:view_own'];
const BILLING_APPROVE = ['billing:update'];
const BILLING_OWN = ['billing:view_own'];
const BILLING_RATES = ['billing:read'];
const REPORTS = ['reports:read', 'reports:view_own'];
const REPORTS_SCHED = ['reports:update'];
const ANALYTICS = ['dashboard_executive:read'];
const INTEGRATIONS = ['integrations:read'];
const ADMIN_USERS = ['admin_users:read'];
const ADMIN_TENANTS = ['admin_tenants_units:read'];
const ADMIN_HIERARCHY = ['admin_hierarchy:read'];
const AUDIT = ['audit:read'];
const ADMIN_SETTINGS = ['admin_tenant_config:update'];
const ADMIN_API_KEYS = ['api_keys:read'];
const ADMIN_ROLES = ['admin_roles:read'];
const BUILDINGS = ['admin_buildings:read', 'dashboard_executive:read', 'dashboard_technical:read'];
const METERS = ['admin_meters:read', 'dashboard_executive:read', 'dashboard_technical:read'];

function P({ any, children }: Readonly<{ any: string[]; children: React.ReactNode }>) {
  return <RequirePerms any={any}>{children}</RequirePerms>;
}

function RootLayout() {
  return (
    <SessionGate>
      <Outlet />
    </SessionGate>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: APP_ROUTES.login,
        element: <LoginRouteShell />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <LayoutShell />,
            children: [
              /* Dashboard */
              { index: true, element: <P any={DASH_ANY}><LazyDashboardPage /></P> },
              { path: APP_ROUTES.executive, element: <P any={DASH_EXEC}><LazyExecutiveDashboardPage /></P> },
              { path: APP_ROUTES.executiveSite, element: <P any={DASH_EXEC}><LazyExecutiveSitePage /></P> },
              { path: APP_ROUTES.compare, element: <P any={DASH_ANY}><LazyCompareDashboardPage /></P> },

              /* Edificios & Medidores */
              { path: APP_ROUTES.buildings, element: <P any={BUILDINGS}><LazyBuildingsPage /></P> },
              { path: APP_ROUTES.meters, element: <P any={METERS}><LazyMetersPage /></P> },

              /* Alertas */
              { path: APP_ROUTES.alerts, element: <P any={ALERTS}><LazyAlertsPage /></P> },
              { path: APP_ROUTES.alertRules, element: <P any={['alerts:create', 'alerts:update']}><LazyAlertRulesPage /></P> },
              { path: APP_ROUTES.escalation, element: <P any={ALERTS}><LazyEscalationPage /></P> },
              { path: APP_ROUTES.notifications, element: <P any={ALERTS}><LazyNotificationsPage /></P> },
              { path: APP_ROUTES.alertsHistory, element: <P any={ALERTS}><LazyAlertsHistoryPage /></P> },

              /* Monitoreo */
              { path: APP_ROUTES.monitoring.realtime, element: <P any={MONITORING}><LazyRealtimePage /></P> },
              { path: APP_ROUTES.monitoring.drilldown, element: <P any={MONITORING}><LazyDrilldownPage /></P> },
              { path: APP_ROUTES.monitoring.demand, element: <P any={MONITORING}><LazyDemandPage /></P> },
              { path: APP_ROUTES.monitoring.quality, element: <P any={MONITORING}><LazyQualityPage /></P> },
              { path: APP_ROUTES.monitoring.devices, element: <P any={DEVICES}><LazyDevicesPage /></P> },
              { path: APP_ROUTES.monitoring.metersByType, element: <P any={MONITORING}><LazyMetersByTypePage /></P> },
              { path: APP_ROUTES.monitoring.generationIndex, element: <P any={MONITORING}><LazyGenerationSitePage /></P> },
              { path: APP_ROUTES.monitoring.generationSite, element: <P any={MONITORING}><LazyGenerationSitePage /></P> },
              { path: APP_ROUTES.monitoring.modbusMapIndex, element: <P any={DASH_TECH}><LazyModbusMapPage /></P> },
              { path: APP_ROUTES.monitoring.modbusMapSite, element: <P any={DASH_TECH}><LazyModbusMapPage /></P> },
              { path: APP_ROUTES.monitoring.concentrator, element: <P any={DEVICES}><LazyConcentratorPage /></P> },
              { path: APP_ROUTES.monitoring.faultHistory, element: <P any={FAULTS}><LazyFaultHistoryPage /></P> },

              /* Facturación */
              { path: APP_ROUTES.billing.invoices, element: <P any={BILLING_READ}><LazyInvoicesPage /></P> },
              { path: APP_ROUTES.billing.history, element: <P any={BILLING_READ}><LazyBillingHistoryPage /></P> },
              { path: APP_ROUTES.billing.approve, element: <P any={BILLING_APPROVE}><LazyBillingApprovePage /></P> },
              { path: APP_ROUTES.billing.myInvoice, element: <P any={BILLING_OWN}><LazyMyInvoicePage /></P> },
              { path: APP_ROUTES.billing.rates, element: <P any={BILLING_RATES}><LazyTariffsPage /></P> },

              /* Reportes */
              { path: APP_ROUTES.reports, element: <P any={REPORTS}><LazyReportsPage /></P> },
              { path: APP_ROUTES.reportsScheduled, element: <P any={REPORTS_SCHED}><LazyReportsPage /></P> },

              /* Analítica */
              { path: APP_ROUTES.analytics.benchmark, element: <P any={ANALYTICS}><LazyBenchmarkPage /></P> },
              { path: APP_ROUTES.analytics.trends, element: <P any={ANALYTICS}><LazyTrendsPage /></P> },
              { path: APP_ROUTES.analytics.patterns, element: <P any={ANALYTICS}><LazyPatternsPage /></P> },

              /* Integraciones */
              { path: APP_ROUTES.integrations, element: <P any={INTEGRATIONS}><LazyIntegrationsPage /></P> },
              { path: APP_ROUTES.integrationsStatus, element: <P any={INTEGRATIONS}><LazyIntegrationsPage /></P> },
              { path: APP_ROUTES.integrationsConfig, element: <P any={INTEGRATIONS}><LazyIntegrationsPage /></P> },
              { path: APP_ROUTES.integrationsSyncLog, element: <P any={INTEGRATIONS}><LazyIntegrationsPage /></P> },

              /* Components (dev) */
              { path: APP_ROUTES.components, element: <LazyComponentsPage /> },

              /* Admin */
              { path: APP_ROUTES.admin.users, element: <P any={ADMIN_USERS}><LazyUsersPage /></P> },
              { path: APP_ROUTES.admin.tenants, element: <P any={ADMIN_TENANTS}><LazyTenantsPage /></P> },
              { path: APP_ROUTES.admin.hierarchy, element: <P any={ADMIN_HIERARCHY}><LazyHierarchyPage /></P> },
              { path: APP_ROUTES.admin.audit, element: <P any={AUDIT}><LazyAuditPage /></P> },
              { path: APP_ROUTES.admin.auditChanges, element: <P any={AUDIT}><LazyAuditChangesPage /></P> },
              { path: APP_ROUTES.admin.auditAccess, element: <P any={AUDIT}><LazyAuditAccessPage /></P> },
              { path: APP_ROUTES.admin.settings, element: <P any={ADMIN_SETTINGS}><LazyTenantSettingsPage /></P> },
              { path: APP_ROUTES.admin.apiKeys, element: <P any={ADMIN_API_KEYS}><LazyApiKeysPage /></P> },
              { path: APP_ROUTES.admin.roles, element: <P any={ADMIN_ROLES}><LazyRolesPage /></P> },
            ],
          },
        ],
      },
    ],
  },
]);
