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
  contextSelect: {
    path: '/context/select',
    label: 'Seleccionar sitio',
    allowedRoles: PERMISSIONS.CONTEXT_SELECT.view,
  },
  buildings: {
    path: '/',
    label: 'Edificios',
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
  monitoringRealtime: {
    path: '/monitoring/realtime',
    label: 'Monitoreo en Tiempo Real',
    allowedRoles: PERMISSIONS.MONITORING_REALTIME.view,
    showInNav: true,
  },
  monitoringDevices: {
    path: '/monitoring/devices',
    label: 'Dispositivos',
    allowedRoles: PERMISSIONS.MONITORING_DEVICES.view,
    showInNav: true,
  },
  iotDevicesLegacy: {
    path: '/iot-devices',
    label: 'Dispositivos Legacy',
    allowedRoles: PERMISSIONS.MONITORING_DEVICES.view,
  },
  alerts: {
    path: '/alerts',
    label: 'Alertas',
    allowedRoles: PERMISSIONS.ALERTS_OVERVIEW.view,
    showInNav: true,
  },
  alertDetail: {
    path: '/alerts/:id',
    label: 'Detalle Alerta',
    allowedRoles: PERMISSIONS.ALERT_DETAIL.view,
  },
  drilldown: {
    path: '/monitoring/drilldown/:siteId',
    label: 'Drill-down',
    allowedRoles: PERMISSIONS.MONITORING_DRILLDOWN.view,
    showInNav: true,
  },
  adminSites: {
    path: '/admin/sites',
    label: 'Administrar Sitios',
    allowedRoles: PERMISSIONS.ADMIN_SITES.view,
    showInNav: true,
  },
  adminUsers: {
    path: '/admin/users',
    label: 'Administrar Usuarios',
    allowedRoles: PERMISSIONS.ADMIN_USERS.view,
    showInNav: true,
  },
  adminMeters: {
    path: '/admin/meters',
    label: 'Administrar Medidores',
    allowedRoles: PERMISSIONS.ADMIN_METERS.view,
    showInNav: true,
  },
  adminHierarchy: {
    path: '/admin/hierarchy/:siteId',
    label: 'Administrar Jerarquía',
    allowedRoles: PERMISSIONS.ADMIN_HIERARCHY.view,
    showInNav: true,
  },
  billing: {
    path: '/billing',
    label: 'Facturación',
    allowedRoles: PERMISSIONS.BILLING_OVERVIEW.view,
    showInNav: true,
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
