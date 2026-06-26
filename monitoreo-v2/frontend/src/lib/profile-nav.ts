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
}

/* ── Shared entry fragments (reused across profiles) ── */

const DASHBOARD_GENERAL: ProfileSubItem = { to: '/', label: 'General', end: true };
const DASHBOARD_EJECUTIVO: ProfileSubItem = { to: APP_ROUTES.executive, label: 'Ejecutivo' };
const DASHBOARD_COMPARATIVO: ProfileSubItem = { to: APP_ROUTES.compare, label: 'Comparativo' };

const MONITOREO_MEDIDORES: ProfileSubItem = { to: '/meters', label: 'Medidores' };
const MONITOREO_EDIFICIOS: ProfileSubItem = { to: '/buildings', label: 'Edificios' };
const MONITOREO_MAPA: ProfileSubItem = { to: '/map', label: 'Mapa' };

const ALERTAS_MAIN: ProfileSubItem = { to: '/alerts', label: 'Alertas', end: true };
const ALERTAS_HISTORIAL: ProfileSubItem = { to: '/alerts/history', label: 'Historial / SLA' };
const ALERTAS_REGLAS: ProfileSubItem = { to: '/alerts/rules', label: 'Reglas' };
const ALERTAS_ESCALAMIENTO: ProfileSubItem = { to: '/alerts/escalation', label: 'Escalamiento' };
const ALERTAS_NOTIFICACIONES: ProfileSubItem = { to: '/alerts/notifications', label: 'Notificaciones' };

const FACTURACION_FACTURAS: ProfileSubItem = { to: '/billing', label: 'Facturas', end: true };
const FACTURACION_TARIFAS: ProfileSubItem = { to: '/billing/rates', label: 'Tarifas' };
const FACTURACION_APROBACION: ProfileSubItem = { to: '/billing/approve', label: 'Aprobación' };
const FACTURACION_HISTORIAL: ProfileSubItem = { to: '/billing/history', label: 'Historial' };

const REPORTES_MAIN: ProfileSubItem = { to: '/reports', label: 'Reportes', end: true };
const REPORTES_BENCHMARK: ProfileSubItem = { to: '/analytics/benchmark', label: 'Benchmarking' };
const REPORTES_TENDENCIAS: ProfileSubItem = { to: '/analytics/trends', label: 'Tendencias' };
const REPORTES_PATRONES: ProfileSubItem = { to: '/analytics/patterns', label: 'Patrones' };

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
  {
    label: 'Panel Consolidado',
    icon: 'dashboard',
    basePath: '/dashboard',
    children: [DASHBOARD_CONSOLIDADO, DASHBOARD_CONSUMO, DASHBOARD_COSTOS, DASHBOARD_EJECUTIVO, DASHBOARD_COMPARATIVO],
  },
  {
    label: 'Monitoreo',
    icon: 'monitoring',
    basePath: '/monitoring',
    extraPaths: ['/buildings', '/meters', '/map'],
    children: [MONITOREO_EDIFICIOS, MONITOREO_MEDIDORES, MONITOREO_MAPA],
  },
  {
    label: 'Alertas',
    icon: 'alerts',
    basePath: '/alerts',
    children: [ALERTAS_AGREGADAS, ALERTAS_MAIN, ALERTAS_HISTORIAL],
  },
  {
    label: 'Facturación',
    icon: 'billing',
    basePath: '/billing',
    children: [FACTURACION_FACTURAS, FACTURACION_TARIFAS],
  },
  {
    label: 'Reportes y Analítica',
    icon: 'analytics',
    basePath: '/reports',
    extraPaths: ['/analytics'],
    children: [REPORTES_EJECUTIVOS, REPORTES_EXPORTAR, REPORTES_MAIN, REPORTES_BENCHMARK, REPORTES_TENDENCIAS, REPORTES_PATRONES],
  },
];

const OPERACIONAL_NAV: ProfileNavEntry[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    basePath: '/dashboard',
    children: [DASHBOARD_GENERAL, DASHBOARD_EJECUTIVO],
  },
  {
    label: 'Monitoreo',
    icon: 'monitoring',
    basePath: '/monitoring',
    extraPaths: ['/buildings', '/meters', '/map', '/operacional'],
    children: [MONITOREO_EN_VIVO, MONITOREO_MEDIDORES, MONITOREO_EDIFICIOS, MONITOREO_MAPA, MAPA_COBERTURA],
  },
  {
    label: 'Alertas',
    icon: 'alerts',
    basePath: '/alerts',
    extraPaths: ['/operacional/alarmas', '/operacional/tickets'],
    children: [ALERTAS_GESTION, ALERTAS_TICKETS, ALERTAS_MAIN, ALERTAS_REGLAS, ALERTAS_ESCALAMIENTO, ALERTAS_NOTIFICACIONES, ALERTAS_HISTORIAL],
  },
  {
    label: 'Facturación',
    icon: 'billing',
    basePath: '/billing',
    children: [FACTURACION_FACTURAS, FACTURACION_APROBACION, FACTURACION_HISTORIAL, FACTURACION_TARIFAS],
  },
  {
    label: 'Integraciones',
    icon: 'integrations',
    to: APP_ROUTES.integrations,
    basePath: '/integrations',
  },
  {
    label: 'Administración',
    icon: 'admin',
    basePath: '/admin',
    extraPaths: ['/operacional/calidad', '/operacional/cnr'],
    children: [
      CALIDAD_BACKFILL,
      CNR_PENDIENTES,
      { to: '/admin/users', label: 'Usuarios' },
      { to: '/admin/tenants', label: 'Locatarios' },
      { to: '/admin/hierarchy', label: 'Jerarquía' },
      { to: '/admin/roles', label: 'Roles' },
      { to: '/admin/data-quality', label: 'Calidad de Datos' },
      { to: '/admin/audit', label: 'Auditoría' },
      { to: '/admin/settings', label: 'Configuración' },
    ],
  },
];

const TECNICO_ORDENES: ProfileSubItem = { to: APP_ROUTES.misOrdenes, label: 'Mis órdenes' };
const TECNICO_CATALOGO: ProfileSubItem = { to: APP_ROUTES.medidoresCatalogo, label: 'Catálogo' };
const TECNICO_DIAGNOSTICO: ProfileSubItem = { to: APP_ROUTES.diagnosticoComms, label: 'Diagnóstico' };
const TECNICO_INTERVENCION: ProfileSubItem = { to: APP_ROUTES.regIntervencion, label: 'Intervención' };
const TECNICO_CNR: ProfileSubItem = { to: APP_ROUTES.ingresoCnr, label: 'Ingreso CNR' };
const TECNICO_MAESTRO: ProfileSubItem = { to: APP_ROUTES.maestroMedidores, label: 'Maestro' };

const TECNICO_NAV: ProfileNavEntry[] = [
  {
    label: 'Órdenes',
    icon: 'monitoring',
    basePath: '/tecnico/ordenes',
    children: [TECNICO_ORDENES],
  },
  {
    label: 'Medidores',
    icon: 'monitoring',
    basePath: '/tecnico',
    extraPaths: ['/meters', '/buildings'],
    children: [TECNICO_CATALOGO, TECNICO_DIAGNOSTICO, TECNICO_MAESTRO, MONITOREO_MEDIDORES, MONITOREO_EDIFICIOS],
  },
  {
    label: 'Registro',
    icon: 'admin',
    basePath: '/tecnico/intervencion',
    extraPaths: ['/tecnico/cnr'],
    children: [TECNICO_INTERVENCION, TECNICO_CNR],
  },
  {
    label: 'Alertas',
    icon: 'alerts',
    basePath: '/alerts',
    children: [ALERTAS_MAIN, ALERTAS_HISTORIAL],
  },
];

const AUDITOR_NAV: ProfileNavEntry[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    basePath: '/dashboard',
    children: [DASHBOARD_GENERAL, DASHBOARD_EJECUTIVO],
  },
  {
    label: 'Monitoreo',
    icon: 'monitoring',
    basePath: '/monitoring',
    extraPaths: ['/buildings', '/meters'],
    children: [MONITOREO_EDIFICIOS, MONITOREO_MEDIDORES],
  },
  {
    label: 'Alertas',
    icon: 'alerts',
    basePath: '/alerts',
    children: [ALERTAS_MAIN, ALERTAS_HISTORIAL],
  },
  {
    label: 'Reportes',
    icon: 'analytics',
    basePath: '/reports',
    children: [REPORTES_MAIN],
  },
  {
    label: 'Auditoría',
    icon: 'admin',
    basePath: '/admin',
    extraPaths: ['/auditor'],
    children: [
      { to: '/admin/audit', label: 'Pista de Auditoría' },
      { to: '/admin/data-quality', label: 'Calidad de Datos' },
      { to: APP_ROUTES.cuadratura, label: 'Cuadratura' },
      { to: APP_ROUTES.trazabilidad, label: 'Trazabilidad' },
      { to: APP_ROUTES.datosCrudos, label: 'Datos Crudos' },
      { to: APP_ROUTES.exportarEvidencia, label: 'Exportar Evidencia' },
      { to: APP_ROUTES.calidadDatos, label: 'Calidad de Datos' },
    ],
  },
];

const SUPER_ADMIN_NAV: ProfileNavEntry[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    basePath: '/dashboard',
    children: [
      DASHBOARD_GENERAL,
      { to: APP_ROUTES.platform, label: 'Plataforma' },
      DASHBOARD_EJECUTIVO,
      DASHBOARD_COMPARATIVO,
    ],
  },
  {
    label: 'Monitoreo',
    icon: 'monitoring',
    basePath: '/monitoring',
    extraPaths: ['/buildings', '/meters', '/map'],
    children: [MONITOREO_MEDIDORES, MONITOREO_EDIFICIOS, MONITOREO_MAPA],
  },
  {
    label: 'Alertas',
    icon: 'alerts',
    basePath: '/alerts',
    children: [ALERTAS_MAIN, ALERTAS_REGLAS, ALERTAS_ESCALAMIENTO, ALERTAS_NOTIFICACIONES, ALERTAS_HISTORIAL],
  },
  {
    label: 'Facturación',
    icon: 'billing',
    basePath: '/billing',
    children: [FACTURACION_FACTURAS, FACTURACION_APROBACION, FACTURACION_HISTORIAL, FACTURACION_TARIFAS],
  },
  {
    label: 'Reportes y Analítica',
    icon: 'analytics',
    basePath: '/reports',
    extraPaths: ['/analytics'],
    children: [REPORTES_MAIN, REPORTES_BENCHMARK, REPORTES_TENDENCIAS, REPORTES_PATRONES],
  },
  {
    label: 'Integraciones',
    icon: 'integrations',
    to: APP_ROUTES.integrations,
    basePath: '/integrations',
  },
  {
    label: 'Administración',
    icon: 'admin',
    basePath: '/admin',
    children: [
      { to: APP_ROUTES.tenantsMalls, label: 'Tenants y Malls' },
      { to: '/admin/companies', label: 'Empresas' },
      { to: '/admin/users', label: 'Usuarios' },
      { to: '/admin/tenants', label: 'Locatarios' },
      { to: '/admin/hierarchy', label: 'Jerarquía' },
      { to: '/admin/roles', label: 'Roles' },
      { to: '/admin/api-keys', label: 'API Keys' },
      { to: '/admin/oauth-clients', label: 'OAuth Clients' },
      { to: '/admin/data-quality', label: 'Calidad de Datos' },
      { to: '/admin/register-mappings', label: 'Mapeos Registros' },
      { to: '/admin/regions', label: 'Regiones' },
      { to: '/admin/breach-reports', label: 'Brechas Seguridad' },
      { to: '/admin/audit', label: 'Auditoría' },
      { to: '/admin/settings', label: 'Configuración' },
      { to: APP_ROUTES.observabilidad, label: 'Observabilidad' },
      { to: APP_ROUTES.configReleases, label: 'Config y Releases' },
      { to: APP_ROUTES.seguridadPam, label: 'Seguridad y PAM' },
    ],
  },
];

const LOCATARIO_NAV: ProfileNavEntry[] = [
  {
    label: 'Facturación',
    icon: 'billing',
    basePath: '/billing',
    children: [FACTURACION_FACTURAS],
  },
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
  locatario: LOCATARIO_NAV,
};
