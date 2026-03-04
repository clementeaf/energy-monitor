import type { Role } from '../types/auth';

/**
 * Matriz de permisos por módulo y acción.
 * Basado en la Hoja 1, sección 1.2 de la especificación.
 */
export const PERMISSIONS: Record<string, Record<string, Role[]>> = {
  DASHBOARD_EXECUTIVE: {
    view_portfolio: ['SUPER_ADMIN', 'CORP_ADMIN', 'ANALYST', 'AUDITOR'],
  },
  DASHBOARD_TECHNICAL: {
    view_realtime: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST'],
  },
  BUILDINGS: {
    view: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST', 'TENANT_USER', 'AUDITOR'],
    manage: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN'],
  },
  LOCALS: {
    view: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST', 'TENANT_USER', 'AUDITOR'],
    manage: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN'],
  },
  METERS: {
    view: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST'],
    manage: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN'],
  },
  ALERTS: {
    view: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'OPERATOR', 'ANALYST', 'AUDITOR'],
    manage: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN'],
  },
  BILLING: {
    view: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'ANALYST', 'TENANT_USER', 'AUDITOR'],
    manage: ['SUPER_ADMIN', 'CORP_ADMIN'],
  },
  REPORTS: {
    view: ['SUPER_ADMIN', 'CORP_ADMIN', 'SITE_ADMIN', 'ANALYST', 'AUDITOR'],
    export: ['SUPER_ADMIN', 'CORP_ADMIN', 'ANALYST'],
  },
  ADMIN_USERS: {
    view: ['SUPER_ADMIN', 'CORP_ADMIN'],
    manage: ['SUPER_ADMIN'],
  },
  AUDIT: {
    view: ['SUPER_ADMIN', 'AUDITOR'],
  },
};

export function hasPermission(role: Role, module: string, action: string): boolean {
  const modulePerms = PERMISSIONS[module];
  if (!modulePerms) return false;
  const allowedRoles = modulePerms[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}
