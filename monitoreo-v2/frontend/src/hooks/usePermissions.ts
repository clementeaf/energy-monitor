import { useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { RoleSlug } from '../types/auth';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const permSet = useMemo(
    () => new Set(user?.permissions ?? []),
    [user?.permissions],
  );

  const has = (module: string, action: string): boolean =>
    permSet.has(`${module}:${action}`);

  const hasAny = (...perms: string[]): boolean =>
    perms.some((p) => permSet.has(p));

  const roleSlug: RoleSlug | null = user?.role.slug ?? null;

  const isAdmin = roleSlug === 'super_admin' || roleSlug === 'corp_admin' || roleSlug === 'site_admin';

  return { has, hasAny, roleSlug, isAdmin, permSet };
}
