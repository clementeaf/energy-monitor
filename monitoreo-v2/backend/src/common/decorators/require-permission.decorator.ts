import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Require a single permission: @RequirePermission('billing', 'create')
 * Stored in JWT as "billing:create" — guard does a Set.has() lookup.
 */
export const RequirePermission = (module: string, action: string) =>
  SetMetadata(PERMISSIONS_KEY, [`${module}:${action}`]);

/**
 * Require ANY of the listed permissions: @RequireAnyPermission('billing:read', 'billing:view_own')
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
