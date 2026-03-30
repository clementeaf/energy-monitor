import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roleId: string;
  roleSlug: string;
  permissions: string[]; // ["dashboard_executive:read", "billing:create", ...]
  buildingIds: string[]; // UUIDs from user_building_access (empty = all buildings)
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string | string[] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user[data] : user;
  },
);
