import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

export type PermissionModule =
  | 'DASHBOARD_EXECUTIVE'
  | 'DASHBOARD_TECHNICAL'
  | 'BUILDINGS'
  | 'LOCALS'
  | 'METERS'
  | 'ALERTS'
  | 'BILLING'
  | 'REPORTS'
  | 'ADMIN_USERS'
  | 'AUDIT';

export type PermissionAction = 'view' | 'manage' | 'export';

export interface RequiredPermission {
  module: PermissionModule;
  action: PermissionAction;
}

export function RequirePermissions(
  module: PermissionModule,
  action: PermissionAction,
) {
  return applyDecorators(
    SetMetadata(REQUIRED_PERMISSION_KEY, { module, action } satisfies RequiredPermission),
    ApiUnauthorizedResponse({ description: 'Token faltante o inválido' }),
    ApiForbiddenResponse({
      description: `Permiso requerido: ${module}.${action}`,
    }),
  );
}