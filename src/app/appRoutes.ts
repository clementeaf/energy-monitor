import type { Role } from '../types/auth';

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
    allowedRoles: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST', 'TENANT_USER', 'AUDITOR'],
    showInNav: true,
  },
  buildingDetail: {
    path: '/buildings/:id',
    label: 'Detalle Edificio',
    allowedRoles: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST', 'TENANT_USER', 'AUDITOR'],
  },
  localDetail: {
    path: '/buildings/:buildingId/locals/:localId',
    label: 'Detalle Local',
    allowedRoles: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST', 'TENANT_USER', 'AUDITOR'],
  },
} as const satisfies Record<string, AppRoute>;

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
    (r) => r.showInNav && (!r.allowedRoles || r.allowedRoles.includes(role)),
  );
}
