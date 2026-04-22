import { createBrowserRouter, Outlet } from 'react-router';
import { SessionGate } from '../components/auth/SessionGate';
import { LayoutShell } from '../components/layout/LayoutShell';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
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
              { index: true, element: <LazyDashboardPage /> },
              { path: APP_ROUTES.executive, element: <LazyExecutiveDashboardPage /> },
              { path: APP_ROUTES.executiveSite, element: <LazyExecutiveSitePage /> },
              { path: APP_ROUTES.compare, element: <LazyCompareDashboardPage /> },
              { path: APP_ROUTES.buildings, element: <LazyBuildingsPage /> },
              { path: APP_ROUTES.meters, element: <LazyMetersPage /> },
              { path: APP_ROUTES.alerts, element: <LazyAlertsPage /> },
              { path: APP_ROUTES.alertRules, element: <LazyAlertRulesPage /> },
              { path: APP_ROUTES.escalation, element: <LazyEscalationPage /> },
              { path: APP_ROUTES.notifications, element: <LazyNotificationsPage /> },
              { path: APP_ROUTES.alertsHistory, element: <LazyAlertsHistoryPage /> },
              { path: APP_ROUTES.monitoring.realtime, element: <LazyRealtimePage /> },
              { path: APP_ROUTES.monitoring.drilldown, element: <LazyDrilldownPage /> },
              { path: APP_ROUTES.monitoring.demand, element: <LazyDemandPage /> },
              { path: APP_ROUTES.monitoring.quality, element: <LazyQualityPage /> },
              { path: APP_ROUTES.monitoring.devices, element: <LazyDevicesPage /> },
              { path: APP_ROUTES.monitoring.metersByType, element: <LazyMetersByTypePage /> },
              { path: APP_ROUTES.monitoring.generationIndex, element: <LazyGenerationSitePage /> },
              { path: APP_ROUTES.monitoring.generationSite, element: <LazyGenerationSitePage /> },
              { path: APP_ROUTES.monitoring.modbusMapIndex, element: <LazyModbusMapPage /> },
              { path: APP_ROUTES.monitoring.modbusMapSite, element: <LazyModbusMapPage /> },
              { path: APP_ROUTES.monitoring.concentrator, element: <LazyConcentratorPage /> },
              { path: APP_ROUTES.monitoring.faultHistory, element: <LazyFaultHistoryPage /> },
              { path: APP_ROUTES.billing.invoices, element: <LazyInvoicesPage /> },
              { path: APP_ROUTES.billing.history, element: <LazyBillingHistoryPage /> },
              { path: APP_ROUTES.billing.approve, element: <LazyBillingApprovePage /> },
              { path: APP_ROUTES.billing.myInvoice, element: <LazyMyInvoicePage /> },
              { path: APP_ROUTES.billing.rates, element: <LazyTariffsPage /> },
              { path: APP_ROUTES.reports, element: <LazyReportsPage /> },
              { path: APP_ROUTES.reportsScheduled, element: <LazyReportsPage /> },
              { path: APP_ROUTES.analytics.benchmark, element: <LazyBenchmarkPage /> },
              { path: APP_ROUTES.integrations, element: <LazyIntegrationsPage /> },
              { path: APP_ROUTES.integrationsStatus, element: <LazyIntegrationsPage /> },
              { path: APP_ROUTES.integrationsConfig, element: <LazyIntegrationsPage /> },
              { path: APP_ROUTES.integrationsSyncLog, element: <LazyIntegrationsPage /> },
              { path: APP_ROUTES.components, element: <LazyComponentsPage /> },
              { path: APP_ROUTES.admin.users, element: <LazyUsersPage /> },
              { path: APP_ROUTES.admin.tenants, element: <LazyTenantsPage /> },
              { path: APP_ROUTES.admin.hierarchy, element: <LazyHierarchyPage /> },
              { path: APP_ROUTES.admin.audit, element: <LazyAuditPage /> },
              { path: APP_ROUTES.admin.auditChanges, element: <LazyAuditChangesPage /> },
              { path: APP_ROUTES.admin.auditAccess, element: <LazyAuditAccessPage /> },
              { path: APP_ROUTES.admin.settings, element: <LazyTenantSettingsPage /> },
              { path: APP_ROUTES.admin.apiKeys, element: <LazyApiKeysPage /> },
              { path: APP_ROUTES.admin.roles, element: <LazyRolesPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
