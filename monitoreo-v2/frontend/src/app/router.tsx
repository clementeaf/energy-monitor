import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { SessionGate } from '../components/auth/SessionGate';
import { LayoutShell } from '../components/layout/LayoutShell';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RequirePerms } from '../components/auth/RequirePerms';
import { RequireTenantLayout } from '../components/ui/RequireTenant';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Redirects to the correct dashboard based on profile:
 * - super_admin without tenant → Platform
 * - gerencial → Panel Consolidado
 * - others → General dashboard
 */
const PROFILE_DASHBOARD: Record<string, string> = {
  gerencial: '/dashboard/consolidado',
  operacional: '/operacional/monitoreo',
  tecnico: '/tecnico/ordenes',
  auditor: '/auditor/calidad-datos',
  super_admin: '/admin/tenants-malls',
};

function DashboardIndex() {
  const { profile } = usePermissions();
  const redirect = PROFILE_DASHBOARD[profile];
  return redirect ? <Navigate to={redirect} replace /> : <LazyDashboardPage />;
}
import { LoginRouteShell } from '../components/routing/LoginRouteShell';
import {
  LazyPanelConsolidadoPage,
  LazyConsumoJerarquicoPage,
  LazyCostosTendenciasPage,
  LazyAlarmasAgregadasPage,
  LazyReportesEjecutivosPage,
  LazyExportarReportesPage,
  LazyMonitoreoVivoPage,
  LazyAlarmasEventosPage,
  LazyTicketsSlaPage,
  LazyCalidadBackfillPage,
  LazyCnrPendientesPage,
  LazyMapaCoberturaPage,
  LazyMisOrdenesPage,
  LazyMedidoresCatalogoPage,
  LazyDiagnosticoCommsPage,
  LazyRegIntervencionPage,
  LazyIngresoCnrPage,
  LazyMaestroMedidoresPage,
  LazyReglasTransformacionPage,
  LazyObservabilidadPage,
  LazyConfigReleasesPage,
  LazySeguridadPamPage,
  LazyCuadraturaPage,
  LazyTrazabilidadPage,
  LazyDatosCrudosPage,
  LazyExportarEvidenciaPage,
  LazyCalidadDatosPage,
  LazyPistaAuditoriaPage,
  LazyTenantsMallsPage,
  LazySlosDatosPage,
  LazyThrottleCargasPage,
  LazyRetencionPrivacidadPage,
  LazyReplicaDatosPage,
  LazyBuildingsPage,
  LazyMetersUnifiedPage,
  LazyAlertsPage,
  LazyComponentsPage,
  LazyDashboardPage,
  LazyExecutiveDashboardPage,
  LazyExecutiveSitePage,
  LazyCompareDashboardPage,
  LazyDrilldownPage,
  LazyDemandPage,
  LazyQualityPage,
  LazyFaultHistoryPage,
  LazyInvoicesPage,
  LazyBillingHistoryPage,
  LazyBillingApprovePage,
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
  LazyGenerationSitePage,
  LazyModbusMapPage,
  LazyConcentratorPage,
  LazyTenantSettingsPage,
  LazyApiKeysPage,
  LazyOAuthClientsPage,
  LazyRolesPage,
  LazyCompaniesPage,
  LazyPlatformDashboardPage,
  LazyBuildingDetailPage,
  LazyMeterDetailPage,
  LazyMeterReadingsPage,
  LazyProfilePage,
  LazyMapPage,
  LazyDeletionRequestsPage,
  LazyRectificationRequestsPage,
  LazyDataQualityPage,
  LazyRegisterMappingsPage,
  LazyRegionsPage,
  LazyBreachReportsPage,
  LazyPrivacyPolicyPage,
  LazyIotDevicesPage,
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
const BILLING_RATES = ['billing:read'];
const REPORTS = ['reports:read', 'reports:view_own'];
const REPORTS_SCHED = ['reports:update'];
const ANALYTICS = ['dashboard_executive:read'];
const INTEGRATIONS = ['integrations:read'];
const INTEGRATIONS_WEBHOOKS = ['integrations:read', 'webhooks:read'];
const ADMIN_DATA_QUALITY = ['data_quality:read'];
const ADMIN_REGISTER_MAPPINGS = ['register_mappings:read'];
const ADMIN_USERS = ['admin_users:read'];
const ADMIN_TENANTS = ['admin_tenants_units:read'];
const ADMIN_HIERARCHY = ['admin_hierarchy:read'];
const AUDIT = ['audit:read'];
const ADMIN_SETTINGS = ['admin_tenant_config:update'];
const ADMIN_API_KEYS = ['api_keys:read'];
const ADMIN_OAUTH_CLIENTS = ['oauth_clients:read'];
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
        path: APP_ROUTES.privacyPolicy,
        element: <LazyPrivacyPolicyPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <LayoutShell />,
            children: [
              /* Dashboard — index redirects to Platform or General based on tenant */
              { index: true, element: <P any={DASH_ANY}><DashboardIndex /></P> },
              /* Dashboard — Panel Consolidado (cross-tenant, gerencial profile) */
              { path: APP_ROUTES.consolidado, element: <P any={DASH_EXEC}><LazyPanelConsolidadoPage /></P> },
              /* Dashboard — Consumo Jerárquico (cross-tenant, gerencial profile) */
              { path: APP_ROUTES.consumo, element: <P any={DASH_EXEC}><LazyConsumoJerarquicoPage /></P> },
              /* Dashboard — Costos y Tendencias (cross-tenant, gerencial profile) */
              { path: APP_ROUTES.costos, element: <P any={DASH_EXEC}><LazyCostosTendenciasPage /></P> },
              /* Dashboard — Alarmas Agregadas (cross-tenant, gerencial profile) */
              { path: APP_ROUTES.alarmasAgregadas, element: <P any={DASH_EXEC}><LazyAlarmasAgregadasPage /></P> },
              /* Dashboard — Reportes Ejecutivos (cross-tenant, gerencial profile) */
              { path: APP_ROUTES.reportesEjecutivos, element: <P any={['reports:read', 'reports:view_own']}><LazyReportesEjecutivosPage /></P> },
              /* Dashboard — Exportar Reportes (cross-tenant, gerencial profile) */
              { path: APP_ROUTES.exportarReportes, element: <P any={['reports:read', 'reports:view_own']}><LazyExportarReportesPage /></P> },
              /* Operacional — Monitoreo en Vivo (cross-tenant) */
              { path: APP_ROUTES.monitoreoVivo, element: <P any={MONITORING}><LazyMonitoreoVivoPage /></P> },
              /* Operacional — Alarmas y Eventos (cross-tenant) */
              { path: APP_ROUTES.alarmasEventos, element: <P any={ALERTS}><LazyAlarmasEventosPage /></P> },
              /* Operacional — Tickets y SLA (cross-tenant) */
              { path: APP_ROUTES.ticketsSla, element: <P any={ALERTS}><LazyTicketsSlaPage /></P> },
              /* Operacional — Calidad y Backfill (cross-tenant) */
              { path: APP_ROUTES.calidadBackfill, element: <P any={ADMIN_DATA_QUALITY}><LazyCalidadBackfillPage /></P> },
              /* Operacional — CNR Pendientes (cross-tenant) */
              { path: APP_ROUTES.cnrPendientes, element: <P any={ADMIN_DATA_QUALITY}><LazyCnrPendientesPage /></P> },
              /* Operacional — Mapa de Cobertura (cross-tenant) */
              { path: APP_ROUTES.mapaCobertura, element: <P any={MONITORING}><LazyMapaCoberturaPage /></P> },
              /* Técnico — 6 pages */
              { path: APP_ROUTES.misOrdenes, element: <P any={MONITORING}><LazyMisOrdenesPage /></P> },
              { path: APP_ROUTES.medidoresCatalogo, element: <P any={DEVICES}><LazyMedidoresCatalogoPage /></P> },
              { path: APP_ROUTES.diagnosticoComms, element: <P any={DEVICES}><LazyDiagnosticoCommsPage /></P> },
              { path: APP_ROUTES.regIntervencion, element: <P any={MONITORING}><LazyRegIntervencionPage /></P> },
              { path: APP_ROUTES.ingresoCnr, element: <P any={MONITORING}><LazyIngresoCnrPage /></P> },
              { path: APP_ROUTES.maestroMedidores, element: <P any={DEVICES}><LazyMaestroMedidoresPage /></P> },
              { path: APP_ROUTES.reglasTransformacion, element: <P any={DEVICES}><LazyReglasTransformacionPage /></P> },
              /* Dashboard — Platform (cross-tenant, no tenant needed) */
              { path: APP_ROUTES.platform, element: <P any={DASH_EXEC}><LazyPlatformDashboardPage /></P> },

              /* Alertas (cross-tenant) */
              { path: APP_ROUTES.alerts, element: <P any={ALERTS}><LazyAlertsPage /></P> },
              { path: APP_ROUTES.alertRules, element: <P any={['alerts:create', 'alerts:update']}><LazyAlertRulesPage /></P> },
              { path: APP_ROUTES.escalation, element: <P any={ALERTS}><LazyEscalationPage /></P> },
              { path: APP_ROUTES.notifications, element: <P any={ALERTS}><LazyNotificationsPage /></P> },
              { path: APP_ROUTES.alertsHistory, element: <P any={ALERTS}><LazyAlertsHistoryPage /></P> },

              /* ── Tenant-required routes (wrapped with RequireTenantLayout) ── */
              {
                element: <RequireTenantLayout />,
                children: [
                  /* Dashboard (tenant-scoped) */
                  { path: APP_ROUTES.executive, element: <P any={DASH_EXEC}><LazyExecutiveDashboardPage /></P> },
                  { path: APP_ROUTES.executiveSite, element: <P any={DASH_EXEC}><LazyExecutiveSitePage /></P> },
                  { path: APP_ROUTES.compare, element: <P any={DASH_ANY}><LazyCompareDashboardPage /></P> },

                  /* Monitoreo — redirects to unified /meters */
                  { path: APP_ROUTES.monitoring.realtime, element: <Navigate to="/meters" replace /> },
                  { path: APP_ROUTES.monitoring.drilldown, element: <P any={MONITORING}><LazyDrilldownPage /></P> },
                  { path: APP_ROUTES.monitoring.demand, element: <P any={MONITORING}><LazyDemandPage /></P> },
                  { path: APP_ROUTES.monitoring.quality, element: <P any={MONITORING}><LazyQualityPage /></P> },
                  { path: APP_ROUTES.monitoring.devices, element: <Navigate to="/meters?tab=devices" replace /> },
                  { path: APP_ROUTES.monitoring.metersByType, element: <Navigate to="/meters?tab=by-type" replace /> },
                  { path: APP_ROUTES.monitoring.generationIndex, element: <P any={MONITORING}><LazyGenerationSitePage /></P> },
                  { path: APP_ROUTES.monitoring.generationSite, element: <P any={MONITORING}><LazyGenerationSitePage /></P> },
                  { path: APP_ROUTES.monitoring.modbusMapIndex, element: <P any={DASH_TECH}><LazyModbusMapPage /></P> },
                  { path: APP_ROUTES.monitoring.modbusMapSite, element: <P any={DASH_TECH}><LazyModbusMapPage /></P> },
                  { path: APP_ROUTES.monitoring.concentrator, element: <P any={DEVICES}><LazyConcentratorPage /></P> },
                  { path: APP_ROUTES.monitoring.faultHistory, element: <P any={FAULTS}><LazyFaultHistoryPage /></P> },
                  /* meter detail/readings moved to cross-tenant */

                  /* Edificio detalle (tenant auto-detected from building) */

                  /* Facturación */
                  { path: APP_ROUTES.billing.invoices, element: <P any={BILLING_READ}><LazyInvoicesPage /></P> },
                  { path: APP_ROUTES.billing.history, element: <P any={BILLING_READ}><LazyBillingHistoryPage /></P> },
                  { path: APP_ROUTES.billing.approve, element: <P any={BILLING_APPROVE}><LazyBillingApprovePage /></P> },
                  { path: APP_ROUTES.billing.myInvoice, element: <Navigate to="/billing" replace /> },
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
                  { path: APP_ROUTES.integrationsWebhooks, element: <P any={INTEGRATIONS_WEBHOOKS}><LazyIntegrationsPage /></P> },
                  { path: APP_ROUTES.integrationsWebhookDeliveries, element: <P any={INTEGRATIONS_WEBHOOKS}><LazyIntegrationsPage /></P> },
                  { path: APP_ROUTES.integrationsGaps, element: <P any={INTEGRATIONS}><LazyIntegrationsPage /></P> },
                  { path: APP_ROUTES.integrationsBackfill, element: <P any={INTEGRATIONS}><LazyIntegrationsPage /></P> },
                  { path: APP_ROUTES.integrationsStatus, element: <P any={INTEGRATIONS}><LazyIntegrationsPage /></P> },
                  { path: APP_ROUTES.integrationsConfig, element: <P any={INTEGRATIONS}><LazyIntegrationsPage /></P> },
                  { path: APP_ROUTES.integrationsSyncLog, element: <P any={INTEGRATIONS}><LazyIntegrationsPage /></P> },

                  /* Admin (tenant-scoped) */
                  { path: APP_ROUTES.admin.tenants, element: <P any={ADMIN_TENANTS}><LazyTenantsPage /></P> },
                  { path: APP_ROUTES.admin.hierarchy, element: <P any={ADMIN_HIERARCHY}><LazyHierarchyPage /></P> },
                  { path: APP_ROUTES.admin.audit, element: <P any={AUDIT}><LazyAuditPage /></P> },
                  { path: APP_ROUTES.admin.auditChanges, element: <P any={AUDIT}><LazyAuditChangesPage /></P> },
                  { path: APP_ROUTES.admin.auditAccess, element: <P any={AUDIT}><LazyAuditAccessPage /></P> },
                  { path: APP_ROUTES.admin.settings, element: <P any={ADMIN_SETTINGS}><LazyTenantSettingsPage /></P> },
                  { path: APP_ROUTES.admin.apiKeys, element: <P any={ADMIN_API_KEYS}><LazyApiKeysPage /></P> },
                  { path: APP_ROUTES.admin.oauthClients, element: <P any={ADMIN_OAUTH_CLIENTS}><LazyOAuthClientsPage /></P> },
                  { path: APP_ROUTES.admin.dataQuality, element: <P any={ADMIN_DATA_QUALITY}><LazyDataQualityPage /></P> },
                  { path: APP_ROUTES.admin.registerMappings, element: <P any={ADMIN_REGISTER_MAPPINGS}><LazyRegisterMappingsPage /></P> },
                  { path: APP_ROUTES.admin.regions, element: <P any={BUILDINGS}><LazyRegionsPage /></P> },
                  { path: APP_ROUTES.admin.breachReports, element: <P any={AUDIT}><LazyBreachReportsPage /></P> },
                  /* Auditor — 6 pages (tenant-scoped) */
                  { path: APP_ROUTES.calidadDatos, element: <P any={AUDIT}><LazyCalidadDatosPage /></P> },
                  { path: APP_ROUTES.cuadratura, element: <P any={AUDIT}><LazyCuadraturaPage /></P> },
                  { path: APP_ROUTES.pistaAuditoria, element: <P any={AUDIT}><LazyPistaAuditoriaPage /></P> },
                  { path: APP_ROUTES.trazabilidad, element: <P any={AUDIT}><LazyTrazabilidadPage /></P> },
                  { path: APP_ROUTES.datosCrudos, element: <P any={AUDIT}><LazyDatosCrudosPage /></P> },
                  { path: APP_ROUTES.exportarEvidencia, element: <P any={AUDIT}><LazyExportarEvidenciaPage /></P> },
                  { path: APP_ROUTES.admin.roles, element: <P any={ADMIN_ROLES}><LazyRolesPage /></P> },
                  { path: APP_ROUTES.admin.deletionRequests, element: <P any={ADMIN_USERS}><LazyDeletionRequestsPage /></P> },
                  { path: APP_ROUTES.admin.rectificationRequests, element: <P any={ADMIN_USERS}><LazyRectificationRequestsPage /></P> },
                ],
              },

              /* ── Cross-tenant routes (no tenant required) ── */

              /* Platform-only (no tenant needed) */
              { path: APP_ROUTES.observabilidad, element: <P any={DASH_EXEC}><LazyObservabilidadPage /></P> },
              { path: APP_ROUTES.configReleases, element: <P any={DASH_EXEC}><LazyConfigReleasesPage /></P> },
              { path: APP_ROUTES.admin.iotDevices, element: <P any={DASH_EXEC}><LazyIotDevicesPage /></P> },
              { path: APP_ROUTES.tenantsMalls, element: <P any={DASH_EXEC}><LazyTenantsMallsPage /></P> },
              { path: APP_ROUTES.slosDatos, element: <P any={DASH_EXEC}><LazySlosDatosPage /></P> },
              { path: APP_ROUTES.throttleCargas, element: <P any={DASH_EXEC}><LazyThrottleCargasPage /></P> },
              { path: APP_ROUTES.retencionPrivacidad, element: <P any={DASH_EXEC}><LazyRetencionPrivacidadPage /></P> },
              { path: APP_ROUTES.replicaDatos, element: <P any={DASH_EXEC}><LazyReplicaDatosPage /></P> },
              { path: APP_ROUTES.seguridadPam, element: <P any={AUDIT}><LazySeguridadPamPage /></P> },

              /* Edificios & Medidores (listas cross-tenant) */
              { path: APP_ROUTES.buildingDetail, element: <P any={BUILDINGS}><LazyBuildingDetailPage /></P> },
              { path: APP_ROUTES.monitoring.meterDetail, element: <P any={MONITORING}><LazyMeterDetailPage /></P> },
              { path: APP_ROUTES.monitoring.meterReadings, element: <P any={MONITORING}><LazyMeterReadingsPage /></P> },
              { path: APP_ROUTES.buildings, element: <P any={BUILDINGS}><LazyBuildingsPage /></P> },
              { path: APP_ROUTES.map, element: <P any={BUILDINGS}><LazyMapPage /></P> },
              { path: APP_ROUTES.meters, element: <P any={METERS}><LazyMetersUnifiedPage /></P> },

              /* Admin — cross-tenant routes */
              { path: APP_ROUTES.admin.users, element: <P any={ADMIN_USERS}><LazyUsersPage /></P> },
              { path: APP_ROUTES.admin.companies, element: <P any={['admin_tenants:create']}><LazyCompaniesPage /></P> },

              /* Profile — ARCO+ rights (accessible to all authenticated users) */
              { path: APP_ROUTES.profile, element: <LazyProfilePage /> },

              /* Components (dev only) */
              ...(import.meta.env.DEV ? [{ path: APP_ROUTES.components, element: <LazyComponentsPage /> }] : []),
            ],
          },
        ],
      },
    ],
  },
]);
