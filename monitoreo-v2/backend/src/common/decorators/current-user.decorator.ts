import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roleId: string;
  roleSlug: string;
  permissions: string[];  // ["dashboard_executive:read", "billing:create", ...]
  buildingIds: string[];  // UUIDs from user_building_access (empty = all buildings)
  crossTenant?: boolean;  // true when super_admin views all tenants (no tenant selected)
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user[data] : user;
  },
);
