import { APP_ROUTES } from '../app/routes';
import type { NavModuleIconName } from '../components/layout/sidebar-icons';
import type { UserProfile } from './profiles';

export interface ProfileSubItem {
  to: string;
  label: string;
  end?: boolean;
}

export interface ProfileNavEntry {
  label: string;
  icon: NavModuleIconName;
  /** Direct route (no children) */
  to?: string;
  /** Base path for active detection */
  basePath: string;
  /** Additional paths that also highlight this entry */
  extraPaths?: string[];
  children?: ProfileSubItem[];
  /** Hide when a tenant is selected (platform-global views only) */
  platformOnly?: boolean;
}

/* ── Profile-specific nav definitions ── */

const DASHBOARD_CONSOLIDADO: ProfileSubItem = { to: APP_ROUTES.consolidado, label: 'Consolidado' };
const DASHBOARD_CONSUMO: ProfileSubItem = { to: APP_ROUTES.consumo, label: 'Consumo' };
const DASHBOARD_COSTOS: ProfileSubItem = { to: APP_ROUTES.costos, label: 'Costos' };
const ALERTAS_AGREGADAS: ProfileSubItem = { to: APP_ROUTES.alarmasAgregadas, label: 'Agregadas' };
const REPORTES_EJECUTIVOS: ProfileSubItem = { to: APP_ROUTES.reportesEjecutivos, label: 'Ejecutivos' };
const REPORTES_EXPORTAR: ProfileSubItem = { to: APP_ROUTES.exportarReportes, label: 'Exportar' };
const MONITOREO_EN_VIVO: ProfileSubItem = { to: APP_ROUTES.monitoreoVivo, label: 'En vivo' };
const ALERTAS_GESTION: ProfileSubItem = { to: APP_ROUTES.alarmasEventos, label: 'Gestión' };
const ALERTAS_TICKETS: ProfileSubItem = { to: APP_ROUTES.ticketsSla, label: 'Tickets y SLA' };
const CALIDAD_BACKFILL: ProfileSubItem = { to: APP_ROUTES.calidadBackfill, label: 'Calidad y Backfill' };
const CNR_PENDIENTES: ProfileSubItem = { to: APP_ROUTES.cnrPendientes, label: 'CNR Pendientes' };
const MAPA_COBERTURA: ProfileSubItem = { to: APP_ROUTES.mapaCobertura, label: 'Cobertura' };

const GERENCIAL_NAV: ProfileNavEntry[] = [
  { label: 'Panel Consolidado', icon: 'dashboard', to: APP_ROUTES.consolidado, basePath: '/dashboard/consolidado' },
  { label: 'Consumo Jerárquico', icon: 'monitoring', to: APP_ROUTES.consumo, basePath: '/dashboard/consumo' },
  { label: 'Costos y Tendencias', icon: 'analytics', to: APP_ROUTES.costos, basePath: '/dashboard/costos' },
  { label: 'Reportes Ejecutivos', icon: 'analytics', to: APP_ROUTES.reportesEjecutivos, basePath: '/reports', extraPaths: ['/gerencial/reportes'] },
  { label: 'Alarmas Agregadas', icon: 'alerts', to: APP_ROUTES.alarmasAgregadas, basePath: '/alerts', extraPaths: ['/gerencial/alarmas'] },
  { label: 'Exportar Reportes', icon: 'admin', to: APP_ROUTES.exportarReportes, basePath: '/reports/exportar' },
];

const MAPA_INDOOR: ProfileSubItem = { to: APP_ROUTES.map, label: 'Mapa Indoor' };

const OPERACIONAL_NAV: ProfileNavEntry[] = [
  { label: 'Monitoreo en Vivo', icon: 'monitoring', to: APP_ROUTES.monitoreoVivo, basePath: '/monitoring/realtime', extraPaths: ['/operacional/monitoreo'] },
  { label: 'Alarmas y Eventos', icon: 'alerts', to: APP_ROUTES.alarmasEventos, basePath: '/alerts/events', extraPaths: ['/operacional/alarmas'] },
  { label: 'Tickets y SLA', icon: 'analytics', to: APP_ROUTES.ticketsSla, basePath: '/operacional/tickets' },
  { label: 'Calidad y Backfill', icon: 'admin', to: APP_ROUTES.calidadBackfill, basePath: '/operacional/calidad' },
  { label: 'CNR Pendientes', icon: 'admin', to: APP_ROUTES.cnrPendientes, basePath: '/operacional/cnr' },
  { label: 'Mapa de Cobertura', icon: 'monitoring', to: APP_ROUTES.mapaCobertura, basePath: '/operacional/cobertura', extraPaths: ['/map'] },
];

const TECNICO_NAV: ProfileNavEntry[] = [
  { label: 'Mis Órdenes', icon: 'monitoring', to: APP_ROUTES.misOrdenes, basePath: '/tecnico/ordenes' },
  { label: 'Activos (Medidores)', icon: 'monitoring', to: APP_ROUTES.medidoresCatalogo, basePath: '/tecnico/medidores' },
  { label: 'Diagnóstico Comms', icon: 'monitoring', to: APP_ROUTES.diagnosticoComms, basePath: '/tecnico/diagnostico' },
  { label: 'Reg. Intervención', icon: 'admin', to: APP_ROUTES.regIntervencion, basePath: '/tecnico/intervencion' },
  { label: 'Ingreso CNR', icon: 'admin', to: APP_ROUTES.ingresoCnr, basePath: '/tecnico/cnr' },
  { label: 'Maestro Medidores', icon: 'admin', to: APP_ROUTES.maestroMedidores, basePath: '/tecnico/maestro' },
  { label: 'Reglas Transformación', icon: 'analytics', to: APP_ROUTES.reglasTransformacion, basePath: '/tecnico/reglas' },
];

const AUDITOR_NAV: ProfileNavEntry[] = [
  { label: 'Calidad de Datos', icon: 'analytics', to: APP_ROUTES.calidadDatos, basePath: '/auditor/calidad-datos' },
  { label: 'Cuadratura', icon: 'analytics', to: APP_ROUTES.cuadratura, basePath: '/auditor/cuadratura' },
  { label: 'Pista de Auditoría', icon: 'admin', to: APP_ROUTES.pistaAuditoria, basePath: '/auditor/pista' },
  { label: 'Trazabilidad', icon: 'monitoring', to: APP_ROUTES.trazabilidad, basePath: '/auditor/trazabilidad' },
  { label: 'Datos Crudos', icon: 'monitoring', to: APP_ROUTES.datosCrudos, basePath: '/auditor/datos-crudos' },
  { label: 'Exportar Evidencia', icon: 'admin', to: APP_ROUTES.exportarEvidencia, basePath: '/auditor/evidencia' },
];

const SUPER_ADMIN_NAV: ProfileNavEntry[] = [
  { label: 'Tenants y Malls', icon: 'admin', to: APP_ROUTES.tenantsMalls, basePath: '/admin/tenants-malls', platformOnly: true },
  { label: 'Usuarios y Roles', icon: 'admin', to: '/admin/users', basePath: '/admin/users' },
  { label: 'Seguridad y PAM', icon: 'admin', to: APP_ROUTES.seguridadPam, basePath: '/admin/seguridad-pam' },
  { label: 'Observabilidad', icon: 'monitoring', to: APP_ROUTES.observabilidad, basePath: '/admin/observabilidad', platformOnly: true },
  { label: 'Config y Releases', icon: 'analytics', to: APP_ROUTES.configReleases, basePath: '/admin/config-releases', platformOnly: true },
  { label: 'Integraciones', icon: 'integrations', to: APP_ROUTES.integrations, basePath: '/integrations' },
  { label: 'SLOs de Datos', icon: 'analytics', to: APP_ROUTES.slosDatos, basePath: '/admin/slos' },
  { label: 'Throttle y Cargas', icon: 'monitoring', to: APP_ROUTES.throttleCargas, basePath: '/admin/throttle' },
  { label: 'Retención y Privacidad', icon: 'admin', to: APP_ROUTES.retencionPrivacidad, basePath: '/admin/retencion' },
  { label: 'Réplica de Datos', icon: 'monitoring', to: APP_ROUTES.replicaDatos, basePath: '/admin/replica' },
];

/**
 * Nav entries per profile. Pure data — no logic, no conditions.
 * Sidebar looks up the active profile and renders the corresponding entries.
 */
export const PROFILE_NAV: Record<UserProfile, ProfileNavEntry[]> = {
  gerencial: GERENCIAL_NAV,
  operacional: OPERACIONAL_NAV,
  tecnico: TECNICO_NAV,
  auditor: AUDITOR_NAV,
  super_admin: SUPER_ADMIN_NAV,
};
