import type { Role } from '../types/auth';

const ALL_INVITED_ROLES: Role[] = ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST', 'TENANT_USER', 'AUDITOR'];
const TECHNICAL_ROLES: Role[] = ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST'];
const ALERTS_VIEW_ROLES: Role[] = ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST', 'AUDITOR'];
const SITE_ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN'];
const ADMIN_USERS_VIEW_ROLES: Role[] = ['SUPER_ADMIN', 'CORP_ADMIN'];
const ADMIN_USERS_MANAGE_ROLES: Role[] = ['SUPER_ADMIN'];

/**
 * Matriz de permisos por vista y acción.
 * `module = vista`: cada código corresponde a una pantalla persistida en la tabla `modules`.
 */
export const PERMISSIONS: Record<string, Record<string, Role[]>> = {
  CONTEXT_SELECT: {
    view: ALL_INVITED_ROLES,
  },
  BUILDINGS_OVERVIEW: {
    view: ALL_INVITED_ROLES,
  },
  BUILDING_DETAIL: {
    view: ALL_INVITED_ROLES,
  },
  METER_DETAIL: {
    view: TECHNICAL_ROLES,
  },
  MONITORING_REALTIME: {
    view: TECHNICAL_ROLES,
  },
  MONITORING_DEVICES: {
    view: TECHNICAL_ROLES,
  },
  ALERTS_OVERVIEW: {
    view: ALERTS_VIEW_ROLES,
    manage: SITE_ADMIN_ROLES,
  },
  ALERT_DETAIL: {
    view: ALERTS_VIEW_ROLES,
    manage: SITE_ADMIN_ROLES,
  },
  MONITORING_DRILLDOWN: {
    view: TECHNICAL_ROLES,
  },
  ADMIN_SITES: {
    view: SITE_ADMIN_ROLES,
  },
  ADMIN_USERS: {
    view: ADMIN_USERS_VIEW_ROLES,
    manage: ADMIN_USERS_MANAGE_ROLES,
  },
  ADMIN_METERS: {
    view: SITE_ADMIN_ROLES,
  },
  ADMIN_HIERARCHY: {
    view: SITE_ADMIN_ROLES,
  },
  BILLING_OVERVIEW: {
    view: SITE_ADMIN_ROLES,
  },
};

export function hasPermission(role: Role, module: string, action: string): boolean {
  const modulePerms = PERMISSIONS[module];
  if (!modulePerms) return false;
  const allowedRoles = modulePerms[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}
