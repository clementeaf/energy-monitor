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
  iotDevices: {
    path: '/iot-devices',
    label: 'Dispositivos',
    allowedRoles: PERMISSIONS.METERS.view,
    showInNav: true,
  },
  alerts: {
    path: '/alerts',
    label: 'Alertas',
    allowedRoles: PERMISSIONS.ALERTS.view,
    showInNav: true,
  },
  drilldown: {
    path: '/monitoring/drilldown/:buildingId',
    label: 'Drill-down',
    allowedRoles: PERMISSIONS.DASHBOARD_TECHNICAL.view_realtime,
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
