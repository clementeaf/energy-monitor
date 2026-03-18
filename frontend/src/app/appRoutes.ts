import type { Role } from '../types/auth';
import { PERMISSIONS } from '../auth/permissions';

export interface AppRoute {
  path: string;
  label: string;
  allowedRoles?: Role[];
  showInNav?: boolean;
}

/** All application routes in one place */
export const appRoutes = {
  // Public
  login:        { path: '/login',        label: 'Iniciar sesión' },
  invitationAccept: { path: '/invite/:token', label: 'Aceptar invitación' },
  unauthorized: { path: '/unauthorized', label: 'Sin acceso' },

  // Protected
  dashboard: {
    path: '/',
    label: 'Dashboard',
    allowedRoles: PERMISSIONS.DASHBOARD_OVERVIEW.view,
    showInNav: true,
  },
  contextSelect: {
    path: '/context/select',
    label: 'Seleccionar sitio',
    allowedRoles: PERMISSIONS.CONTEXT_SELECT.view,
  },
  buildings: {
    path: '/buildings',
    label: 'Activos Inmobiliarios',
    allowedRoles: PERMISSIONS.BUILDINGS_OVERVIEW.view,
    showInNav: true,
  },
  buildingDetail: {
    path: '/buildings/:id',
    label: 'Detalle Edificio',
    allowedRoles: PERMISSIONS.BUILDING_DETAIL.view,
  },
  meterDetail: {
    path: '/meters/:meterId',
    label: 'Detalle Medidor',
    allowedRoles: PERMISSIONS.METER_DETAIL.view,
  },
  meterReadings: {
    path: '/meters/:meterId/readings/:month',
    label: 'Lecturas Medidor',
    allowedRoles: PERMISSIONS.METER_DETAIL.view,
  },
  monitoringRealtime: {
    path: '/monitoring/realtime',
    label: 'Monitoreo',
    allowedRoles: PERMISSIONS.MONITORING_REALTIME.view,
    showInNav: true,
  },
  alerts: {
    path: '/alerts',
    label: 'Alertas',
    allowedRoles: PERMISSIONS.ALERTS_OVERVIEW.view,
    // Merged into Monitoreo page as a tab
  },
  alertDetail: {
    path: '/alerts/:id',
    label: 'Detalle Alerta',
    allowedRoles: PERMISSIONS.ALERT_DETAIL.view,
  },
  comparisons: {
    path: '/comparisons',
    label: 'Comparativas',
    allowedRoles: PERMISSIONS.COMPARISONS_OVERVIEW.view,
    showInNav: true,
  },
  // TODO: restore when needed
  drilldown: {
    path: '/monitoring/drilldown/:siteId',
    label: 'Drill-down',
    allowedRoles: PERMISSIONS.MONITORING_DRILLDOWN.view,
    // showInNav: true,
  },
  adminSites: {
    path: '/admin/sites',
    label: 'Administrar Sitios',
    allowedRoles: PERMISSIONS.ADMIN_SITES.view,
    // showInNav: true,
  },
  adminUsers: {
    path: '/admin/users',
    label: 'Administrar Usuarios',
    allowedRoles: PERMISSIONS.ADMIN_USERS.view,
    // showInNav: true,
  },
  adminMeters: {
    path: '/admin/meters',
    label: 'Administrar Medidores',
    allowedRoles: PERMISSIONS.ADMIN_METERS.view,
    // showInNav: true,
  },
  adminHierarchy: {
    path: '/admin/hierarchy/:siteId',
    label: 'Administrar Jerarquía',
    allowedRoles: PERMISSIONS.ADMIN_HIERARCHY.view,
    // showInNav: true,
  },
  billing: {
    path: '/billing',
    label: 'Facturación',
    allowedRoles: PERMISSIONS.BILLING_OVERVIEW.view,
    // showInNav: true,
  },
  settingsProfile: {
    path: '/settings/profile',
    label: 'Configuracion Perfil',
  },
} as const satisfies Record<string, AppRoute>;

export function canAccessRoute(role: Role, route: AppRoute): boolean {
  return !route.allowedRoles || route.allowedRoles.includes(role);
}

/** Helper: build path with params */
export function buildPath(route: string, params: Record<string, string> = {}): string {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, value),
    route,
  );
}

/** Get nav items for a given role */
export function getNavItems(role: Role): AppRoute[] {
  return (Object.values(appRoutes) as AppRoute[]).filter(
    (r) => r.showInNav && canAccessRoute(role, r),
  );
}
