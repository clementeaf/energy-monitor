import { APP_ROUTES } from '../app/routes';
import type { NavModuleIconName } from '../components/layout/sidebar-icons';

export interface UnifiedNavEntry {
  label: string;
  icon: NavModuleIconName;
  to: string;
  basePath: string;
  extraPaths?: string[];
  requiredPerms: string[];
  platformOnly?: boolean;
}

export interface UnifiedNavGroup {
  label: string;
  entries: UnifiedNavEntry[];
}

export const UNIFIED_NAV: UnifiedNavGroup[] = [
  {
    label: 'Visión General',
    entries: [
      { label: 'Panel Consolidado', icon: 'dashboard', to: APP_ROUTES.consolidado, basePath: '/dashboard/consolidado', requiredPerms: ['dashboard_executive:read'] },
      { label: 'Consumo Jerárquico', icon: 'monitoring', to: APP_ROUTES.consumo, basePath: '/dashboard/consumo', requiredPerms: ['dashboard_executive:read'] },
      { label: 'Costos y Tendencias', icon: 'analytics', to: APP_ROUTES.costos, basePath: '/dashboard/costos', requiredPerms: ['dashboard_executive:read'] },
      { label: 'Reportes Ejecutivos', icon: 'analytics', to: APP_ROUTES.reportesEjecutivos, basePath: '/dashboard/reportes-ejecutivos', requiredPerms: ['reports:read', 'reports:view_own'] },
      { label: 'Alarmas Agregadas', icon: 'alerts', to: APP_ROUTES.alarmasAgregadas, basePath: '/dashboard/alarmas', requiredPerms: ['dashboard_executive:read'] },
      { label: 'Exportar Reportes', icon: 'admin', to: APP_ROUTES.exportarReportes, basePath: '/dashboard/exportar', requiredPerms: ['reports:read', 'reports:view_own'] },
      { label: 'Dashboard Ejecutivo', icon: 'dashboard', to: APP_ROUTES.executive, basePath: '/dashboard/executive', requiredPerms: ['dashboard_executive:read'] },
    ],
  },
  {
    label: 'Operaciones',
    entries: [
      { label: 'Monitoreo en Vivo', icon: 'monitoring', to: APP_ROUTES.monitoreoVivo, basePath: '/operacional/monitoreo', requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read', 'readings:read'] },
      { label: 'Alarmas y Eventos', icon: 'alerts', to: APP_ROUTES.alarmasEventos, basePath: '/operacional/alarmas', requiredPerms: ['alerts:read'] },
      { label: 'Tickets y SLA', icon: 'analytics', to: APP_ROUTES.ticketsSla, basePath: '/operacional/tickets', requiredPerms: ['alerts:read'] },
      { label: 'Calidad y Backfill', icon: 'admin', to: APP_ROUTES.calidadBackfill, basePath: '/operacional/calidad', requiredPerms: ['data_quality:read'] },
      { label: 'CNR Pendientes', icon: 'admin', to: APP_ROUTES.cnrPendientes, basePath: '/operacional/cnr', requiredPerms: ['data_quality:read'] },
      { label: 'Mapa de Cobertura', icon: 'monitoring', to: APP_ROUTES.mapaCobertura, basePath: '/operacional/cobertura', extraPaths: ['/map'], requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read', 'readings:read'] },
    ],
  },
  {
    label: 'Técnico',
    entries: [
      { label: 'Mis Órdenes', icon: 'monitoring', to: APP_ROUTES.misOrdenes, basePath: '/tecnico/ordenes', requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read', 'readings:read'] },
      { label: 'Activos (Medidores)', icon: 'monitoring', to: APP_ROUTES.medidoresCatalogo, basePath: '/tecnico/medidores', requiredPerms: ['diagnostics:read', 'admin_meters:read'] },
      { label: 'Diagnóstico Comms', icon: 'monitoring', to: APP_ROUTES.diagnosticoComms, basePath: '/tecnico/diagnostico', requiredPerms: ['diagnostics:read', 'admin_meters:read'] },
      { label: 'Reg. Intervención', icon: 'admin', to: APP_ROUTES.regIntervencion, basePath: '/tecnico/intervencion', requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read', 'readings:read'] },
      { label: 'Ingreso CNR', icon: 'admin', to: APP_ROUTES.ingresoCnr, basePath: '/tecnico/cnr', requiredPerms: ['dashboard_technical:read', 'dashboard_executive:read', 'readings:read'] },
      { label: 'Maestro Medidores', icon: 'admin', to: APP_ROUTES.maestroMedidores, basePath: '/tecnico/maestro', requiredPerms: ['diagnostics:read', 'admin_meters:read'] },
      { label: 'Reglas Transformación', icon: 'analytics', to: APP_ROUTES.reglasTransformacion, basePath: '/tecnico/reglas', requiredPerms: ['diagnostics:read', 'admin_meters:read'] },
    ],
  },
  {
    label: 'Facturación',
    entries: [
      { label: 'Facturas', icon: 'billing', to: APP_ROUTES.billing.invoices, basePath: '/billing', requiredPerms: ['billing:read', 'billing:view_own'] },
      { label: 'Historial', icon: 'analytics', to: APP_ROUTES.billing.history, basePath: '/billing/history', requiredPerms: ['billing:read', 'billing:view_own'] },
      { label: 'Aprobación', icon: 'admin', to: APP_ROUTES.billing.approve, basePath: '/billing/approve', requiredPerms: ['billing:update'] },
      { label: 'Tarifas', icon: 'analytics', to: APP_ROUTES.billing.rates, basePath: '/billing/rates', requiredPerms: ['billing:read'] },
    ],
  },
  {
    label: 'Analítica',
    entries: [
      { label: 'Benchmark', icon: 'analytics', to: APP_ROUTES.analytics.benchmark, basePath: '/analytics/benchmark', requiredPerms: ['dashboard_executive:read'] },
      { label: 'Tendencias', icon: 'analytics', to: APP_ROUTES.analytics.trends, basePath: '/analytics/trends', requiredPerms: ['dashboard_executive:read'] },
      { label: 'Patrones', icon: 'analytics', to: APP_ROUTES.analytics.patterns, basePath: '/analytics/patterns', requiredPerms: ['dashboard_executive:read'] },
    ],
  },
  {
    label: 'Auditoría',
    entries: [
      { label: 'Calidad de Datos', icon: 'analytics', to: APP_ROUTES.calidadDatos, basePath: '/auditor/calidad-datos', requiredPerms: ['audit:read'] },
      { label: 'Cuadratura', icon: 'analytics', to: APP_ROUTES.cuadratura, basePath: '/auditor/cuadratura', requiredPerms: ['audit:read'] },
      { label: 'Pista de Auditoría', icon: 'admin', to: APP_ROUTES.pistaAuditoria, basePath: '/auditor/pista', requiredPerms: ['audit:read'] },
      { label: 'Trazabilidad', icon: 'monitoring', to: APP_ROUTES.trazabilidad, basePath: '/auditor/trazabilidad', requiredPerms: ['audit:read'] },
      { label: 'Datos Crudos', icon: 'monitoring', to: APP_ROUTES.datosCrudos, basePath: '/auditor/datos-crudos', requiredPerms: ['audit:read'] },
      { label: 'Exportar Evidencia', icon: 'admin', to: APP_ROUTES.exportarEvidencia, basePath: '/auditor/evidencia', requiredPerms: ['audit:read'] },
    ],
  },
  {
    label: 'Administración',
    entries: [
      { label: 'Tenants y Malls', icon: 'admin', to: APP_ROUTES.tenantsMalls, basePath: '/admin/tenants-malls', requiredPerms: ['dashboard_executive:read'], platformOnly: true },
      { label: 'Usuarios y Roles', icon: 'admin', to: APP_ROUTES.admin.users, basePath: '/admin/users', requiredPerms: ['admin_users:read'] },
      { label: 'Seguridad y PAM', icon: 'admin', to: APP_ROUTES.seguridadPam, basePath: '/admin/seguridad-pam', requiredPerms: ['audit:read'] },
      { label: 'Observabilidad', icon: 'monitoring', to: APP_ROUTES.observabilidad, basePath: '/admin/observabilidad', requiredPerms: ['dashboard_executive:read'], platformOnly: true },
      { label: 'Config y Releases', icon: 'analytics', to: APP_ROUTES.configReleases, basePath: '/admin/config-releases', requiredPerms: ['dashboard_executive:read'], platformOnly: true },
      { label: 'Integraciones', icon: 'integrations', to: APP_ROUTES.integrations, basePath: '/integrations', requiredPerms: ['integrations:read'] },
      { label: 'SLOs de Datos', icon: 'analytics', to: APP_ROUTES.slosDatos, basePath: '/admin/slos', requiredPerms: ['dashboard_executive:read'] },
      { label: 'Throttle y Cargas', icon: 'monitoring', to: APP_ROUTES.throttleCargas, basePath: '/admin/throttle', requiredPerms: ['dashboard_executive:read'] },
      { label: 'Retención y Privacidad', icon: 'admin', to: APP_ROUTES.retencionPrivacidad, basePath: '/admin/retencion', requiredPerms: ['dashboard_executive:read'] },
      { label: 'Réplica de Datos', icon: 'monitoring', to: APP_ROUTES.replicaDatos, basePath: '/admin/replica', requiredPerms: ['dashboard_executive:read'] },
    ],
  },
];

export function getVisibleNav(
  hasAny: (...perms: string[]) => boolean,
  hasTenant: boolean,
): UnifiedNavGroup[] {
  return UNIFIED_NAV
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => {
        if (hasTenant && entry.platformOnly) return false;
        return hasAny(...entry.requiredPerms);
      }),
    }))
    .filter((group) => group.entries.length > 0);
}

export function findActiveEntry(
  groups: UnifiedNavGroup[],
  pathname: string,
): { groupIdx: number; entryIdx: number } | null {
  for (let gi = 0; gi < groups.length; gi++) {
    for (let ei = 0; ei < groups[gi].entries.length; ei++) {
      const e = groups[gi].entries[ei];
      const matchesBase = pathname === e.basePath || pathname.startsWith(e.basePath + '/');
      const matchesExtra = e.extraPaths?.some((p) => pathname === p || pathname.startsWith(p + '/')) ?? false;
      if (matchesBase || matchesExtra) return { groupIdx: gi, entryIdx: ei };
    }
  }
  return null;
}
