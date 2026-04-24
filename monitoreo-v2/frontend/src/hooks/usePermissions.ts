import { useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import type { RoleSlug } from '../types/auth';

/** Permission sets per role slug (for viewAs impersonation) */
const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  super_admin: new Set(['*']), // omnipotent
  corp_admin: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'admin_buildings:read', 'admin_meters:read',
    'alerts:read', 'billing:read', 'reports:read', 'reports:view_own',
    'integrations:read',
  ]),
  site_admin: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'admin_buildings:read', 'admin_meters:read',
    'alerts:read', 'alerts:update',
    'billing:read', 'billing:update',
    'admin_users:read', 'admin_tenants_units:read',
    'admin_hierarchy:read', 'reports:read',
  ]),
  operator: new Set([
    'dashboard_technical:read', 'readings:read',
    'diagnostics:read', 'admin_meters:read',
    'alerts:read', 'alerts:update',
    'monitoring_faults:read',
  ]),
  tenant_user: new Set([
    'billing:view_own', 'reports:view_own',
  ]),
  analyst: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'reports:read', 'reports:view_own',
  ]),
  auditor: new Set([
    'dashboard_executive:read', 'dashboard_technical:read',
    'audit:read', 'reports:read',
    'admin_buildings:read', 'admin_meters:read',
  ]),
};

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const viewAsRole = useAppStore((s) => s.viewAsRole);

  const realRoleSlug: RoleSlug | null = user?.role.slug ?? null;
  const isSuperAdmin = realRoleSlug === 'super_admin';

  // Active role: impersonated or real
  const activeRole = (isSuperAdmin && viewAsRole) ? viewAsRole : realRoleSlug;
  const isImpersonating = isSuperAdmin && viewAsRole !== null && viewAsRole !== 'super_admin';

  const permSet = useMemo(() => {
    if (!activeRole) return new Set<string>();
    // If viewing as super_admin (or no impersonation), use real permissions
    if (activeRole === 'super_admin') return new Set(user?.permissions ?? []);
    // Use role-based permission set for impersonation
    return ROLE_PERMISSIONS[activeRole] ?? new Set<string>();
  }, [activeRole, user?.permissions]);

  const isAdmin = activeRole === 'super_admin' || activeRole === 'corp_admin' || activeRole === 'site_admin';

  // super_admin without impersonation bypasses all
  const bypassAll = isSuperAdmin && !isImpersonating;

  const has = (module: string, action: string): boolean =>
    bypassAll || permSet.has('*') || permSet.has(`${module}:${action}`);

  const hasAny = (...perms: string[]): boolean =>
    bypassAll || permSet.has('*') || perms.some((p) => permSet.has(p));

  return {
    has,
    hasAny,
    roleSlug: activeRole,
    realRoleSlug,
    isAdmin,
    isSuperAdmin,
    isImpersonating,
    permSet,
  };
}
