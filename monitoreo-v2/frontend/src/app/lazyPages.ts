import { lazy } from 'react';

export const LazyLoginPage = lazy(async () => {
  const m = await import('../features/auth/LoginPage');
  return { default: m.LoginPage };
});

export const LazyDashboardPage = lazy(async () => {
  const m = await import('../features/dashboard/DashboardPage');
  return { default: m.DashboardPage };
});

export const LazyPanelConsolidadoPage = lazy(async () => {
  const m = await import('../features/dashboard/consolidado/PanelConsolidadoPage');
  return { default: m.PanelConsolidadoPage };
});

export const LazyConsumoJerarquicoPage = lazy(async () => {
  const m = await import('../features/dashboard/consumo/ConsumoJerarquicoPage');
  return { default: m.ConsumoJerarquicoPage };
});

export const LazyMisOrdenesPage = lazy(async () => {
  const m = await import('../features/tecnico/ordenes/MisOrdenesPage');
  return { default: m.MisOrdenesPage };
});
export const LazyMedidoresCatalogoPage = lazy(async () => {
  const m = await import('../features/tecnico/medidores/MedidoresCatalogoPage');
  return { default: m.MedidoresCatalogoPage };
});
export const LazyDiagnosticoCommsPage = lazy(async () => {
  const m = await import('../features/tecnico/diagnostico/DiagnosticoCommsPage');
  return { default: m.DiagnosticoCommsPage };
});
export const LazyRegIntervencionPage = lazy(async () => {
  const m = await import('../features/tecnico/intervencion/RegIntervencionPage');
  return { default: m.RegIntervencionPage };
});
export const LazyIngresoCnrPage = lazy(async () => {
  const m = await import('../features/tecnico/cnr/IngresoCnrPage');
  return { default: m.IngresoCnrPage };
});
export const LazyObservabilidadPage = lazy(async () => {
  const m = await import('../features/admin/observabilidad/ObservabilidadPage');
  return { default: m.ObservabilidadPage };
});
export const LazyConfigReleasesPage = lazy(async () => {
  const m = await import('../features/admin/config-releases/ConfigReleasesPage');
  return { default: m.ConfigReleasesPage };
});
export const LazyCuadraturaPage = lazy(async () => {
  const m = await import('../features/auditor/cuadratura/CuadraturaPage');
  return { default: m.CuadraturaPage };
});
export const LazyTrazabilidadPage = lazy(async () => {
  const m = await import('../features/auditor/trazabilidad/TrazabilidadPage');
  return { default: m.TrazabilidadPage };
});
export const LazyDatosCrudosPage = lazy(async () => {
  const m = await import('../features/auditor/datos-crudos/DatosCrudosPage');
  return { default: m.DatosCrudosPage };
});
export const LazyExportarEvidenciaPage = lazy(async () => {
  const m = await import('../features/auditor/evidencia/ExportarEvidenciaPage');
  return { default: m.ExportarEvidenciaPage };
});
export const LazyCalidadDatosPage = lazy(async () => {
  const m = await import('../features/auditor/calidad-datos/CalidadDatosPage');
  return { default: m.CalidadDatosPage };
});
export const LazyPistaAuditoriaPage = lazy(async () => {
  const m = await import('../features/auditor/pista-auditoria/PistaAuditoriaPage');
  return { default: m.PistaAuditoriaPage };
});
export const LazyTenantsMallsPage = lazy(async () => {
  const m = await import('../features/admin/tenants-malls/TenantsMallsPage');
  return { default: m.TenantsMallsPage };
});
export const LazySlosDatosPage = lazy(async () => {
  const m = await import('../features/admin/slos-datos/SlosDatosPage');
  return { default: m.SlosDatosPage };
});
export const LazyThrottleCargasPage = lazy(async () => {
  const m = await import('../features/admin/throttle-cargas/ThrottleCargasPage');
  return { default: m.ThrottleCargasPage };
});
export const LazyRetencionPrivacidadPage = lazy(async () => {
  const m = await import('../features/admin/retencion-privacidad/RetencionPrivacidadPage');
  return { default: m.RetencionPrivacidadPage };
});
export const LazyReplicaDatosPage = lazy(async () => {
  const m = await import('../features/admin/replica-datos/ReplicaDatosPage');
  return { default: m.ReplicaDatosPage };
});

export const LazySeguridadPamPage = lazy(async () => {
  const m = await import('../features/admin/seguridad-pam/SeguridadPamPage');
  return { default: m.SeguridadPamPage };
});

export const LazyMaestroMedidoresPage = lazy(async () => {
  const m = await import('../features/tecnico/maestro/MaestroMedidoresPage');
  return { default: m.MaestroMedidoresPage };
});

export const LazyReglasTransformacionPage = lazy(async () => {
  const m = await import('../features/tecnico/reglas/ReglasTransformacionPage');
  return { default: m.ReglasTransformacionPage };
});

export const LazyMapaCoberturaPage = lazy(async () => {
  const m = await import('../features/operacional/cobertura/MapaCoberturaPage');
  return { default: m.MapaCoberturaPage };
});

export const LazyCnrPendientesPage = lazy(async () => {
  const m = await import('../features/operacional/cnr/CnrPendientesPage');
  return { default: m.CnrPendientesPage };
});

export const LazyCalidadBackfillPage = lazy(async () => {
  const m = await import('../features/operacional/calidad/CalidadBackfillPage');
  return { default: m.CalidadBackfillPage };
});

export const LazyTicketsSlaPage = lazy(async () => {
  const m = await import('../features/operacional/tickets/TicketsSlaPage');
  return { default: m.TicketsSlaPage };
});

export const LazyAlarmasEventosPage = lazy(async () => {
  const m = await import('../features/operacional/alarmas/AlarmasEventosPage');
  return { default: m.AlarmasEventosPage };
});

export const LazyMonitoreoVivoPage = lazy(async () => {
  const m = await import('../features/operacional/monitoreo/MonitoreoVivoPage');
  return { default: m.MonitoreoVivoPage };
});

export const LazyExportarReportesPage = lazy(async () => {
  const m = await import('../features/dashboard/exportar/ExportarReportesPage');
  return { default: m.ExportarReportesPage };
});

export const LazyReportesEjecutivosPage = lazy(async () => {
  const m = await import('../features/dashboard/reportes/ReportesEjecutivosPage');
  return { default: m.ReportesEjecutivosPage };
});

export const LazyAlarmasAgregadasPage = lazy(async () => {
  const m = await import('../features/dashboard/alarmas/AlarmasAgregadasPage');
  return { default: m.AlarmasAgregadasPage };
});

export const LazyAlertasUnifiedPage = lazy(async () => {
  const m = await import('../features/alertas/AlertasUnifiedPage');
  return { default: m.AlertasUnifiedPage };
});

export const LazyCalidadUnifiedPage = lazy(async () => {
  const m = await import('../features/calidad/CalidadUnifiedPage');
  return { default: m.CalidadUnifiedPage };
});

export const LazyExportarUnifiedPage = lazy(async () => {
  const m = await import('../features/exportar/ExportarUnifiedPage');
  return { default: m.ExportarUnifiedPage };
});

export const LazyCnrUnifiedPage = lazy(async () => {
  const m = await import('../features/cnr/CnrUnifiedPage');
  return { default: m.CnrUnifiedPage };
});

export const LazyCostosTendenciasPage = lazy(async () => {
  const m = await import('../features/dashboard/costos/CostosTendenciasPage');
  return { default: m.CostosTendenciasPage };
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

export const LazyMetersUnifiedPage = lazy(async () => {
  const m = await import('../features/meters/MetersUnifiedPage');
  return { default: m.MetersUnifiedPage };
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

export const LazyOAuthClientsPage = lazy(async () => {
  const m = await import('../features/admin/oauth-clients/OAuthClientsPage');
  return { default: m.OAuthClientsPage };
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

export const LazyRectificationRequestsPage = lazy(async () => {
  const m = await import('../features/admin/rectification-requests/RectificationRequestsPage');
  return { default: m.RectificationRequestsPage };
});

export const LazyDataQualityPage = lazy(async () => {
  const m = await import('../features/admin/data-quality/DataQualityPage');
  return { default: m.DataQualityPage };
});

export const LazyRegisterMappingsPage = lazy(async () => {
  const m = await import('../features/admin/register-mappings/RegisterMappingsPage');
  return { default: m.RegisterMappingsPage };
});

export const LazyRegionsPage = lazy(async () => {
  const m = await import('../features/admin/regions/RegionsPage');
  return { default: m.RegionsPage };
});

export const LazyBreachReportsPage = lazy(async () => {
  const m = await import('../features/admin/breach-reports/BreachReportsPage');
  return { default: m.BreachReportsPage };
});

export const LazyProfilePage = lazy(async () => {
  const m = await import('../features/profile/ProfilePage');
  return { default: m.ProfilePage };
});

export const LazyMapPage = lazy(async () => {
  const m = await import('../features/map/MapPage');
  return { default: m.MapPage };
});

export const LazyIotDevicesPage = lazy(async () => {
  const m = await import('../features/admin/iot-devices/IotDevicesPage');
  return { default: m.IotDevicesPage };
});
