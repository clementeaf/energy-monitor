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
  unauthorized: { path: '/unauthorized', label: 'Sin acceso' },

  // Protected
  contextSelect: {
    path: '/context/select',
    label: 'Seleccionar sitio',
  },
  buildings: {
    path: '/',
    label: 'Edificios',
    allowedRoles: PERMISSIONS.BUILDINGS.view,
    showInNav: true,
  },
  buildingDetail: {
    path: '/buildings/:id',
    label: 'Detalle Edificio',
    allowedRoles: PERMISSIONS.BUILDINGS.view,
  },
  meterDetail: {
    path: '/meters/:meterId',
    label: 'Detalle Medidor',
    allowedRoles: PERMISSIONS.METERS.view,
  },
  monitoringRealtime: {
    path: '/monitoring/realtime',
    label: 'Monitoreo en Tiempo Real',
    allowedRoles: PERMISSIONS.DASHBOARD_TECHNICAL.view_realtime,
    showInNav: true,
  },
  monitoringDevices: {
    path: '/monitoring/devices',
    label: 'Dispositivos',
    allowedRoles: PERMISSIONS.METERS.view,
    showInNav: true,
  },
  iotDevicesLegacy: {
    path: '/iot-devices',
    label: 'Dispositivos Legacy',
    allowedRoles: PERMISSIONS.METERS.view,
  },
  alerts: {
    path: '/alerts',
    label: 'Alertas',
    allowedRoles: PERMISSIONS.ALERTS.view,
    showInNav: true,
  },
  alertDetail: {
    path: '/alerts/:id',
    label: 'Detalle Alerta',
    allowedRoles: PERMISSIONS.ALERTS.view,
  },
  drilldown: {
    path: '/monitoring/drilldown/:siteId',
    label: 'Drill-down',
    allowedRoles: PERMISSIONS.DASHBOARD_TECHNICAL.view_realtime,
  },
  adminSites: {
    path: '/admin/sites',
    label: 'Administrar Sitios',
    allowedRoles: PERMISSIONS.BUILDINGS.manage,
    showInNav: true,
  },
  adminMeters: {
    path: '/admin/meters',
    label: 'Administrar Medidores',
    allowedRoles: PERMISSIONS.METERS.manage,
    showInNav: true,
  },
  adminHierarchy: {
    path: '/admin/hierarchy/:siteId',
    label: 'Administrar Jerarquía',
    allowedRoles: PERMISSIONS.BUILDINGS.manage,
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
