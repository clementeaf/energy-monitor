import { useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { RoleSlug } from '../types/auth';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const permSet = useMemo(
    () => new Set(user?.permissions ?? []),
    [user?.permissions],
  );

  const roleSlug: RoleSlug | null = user?.role.slug ?? null;
  const isSuperAdmin = roleSlug === 'super_admin';
  const isAdmin = isSuperAdmin || roleSlug === 'corp_admin' || roleSlug === 'site_admin';

  // super_admin bypasses all permission checks — omnipotent
  const has = (module: string, action: string): boolean =>
    isSuperAdmin || permSet.has(`${module}:${action}`);

  const hasAny = (...perms: string[]): boolean =>
    isSuperAdmin || perms.some((p) => permSet.has(p));

  return { has, hasAny, roleSlug, isAdmin, isSuperAdmin, permSet };
}
