import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

export type PermissionModule =
  | 'CONTEXT_SELECT'
  | 'BUILDINGS_OVERVIEW'
  | 'BUILDING_DETAIL'
  | 'METER_DETAIL'
  | 'MONITORING_REALTIME'
  | 'MONITORING_DEVICES'
  | 'ALERTS_OVERVIEW'
  | 'ALERT_DETAIL'
  | 'MONITORING_DRILLDOWN'
  | 'ADMIN_SITES'
  | 'ADMIN_USERS'
  | 'ADMIN_METERS'
  | 'ADMIN_HIERARCHY';

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