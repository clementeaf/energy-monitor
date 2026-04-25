import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { JwtPayload } from '../decorators/current-user.decorator';

/**
 * For super_admin:
 * - With `_tenantOverride` → scope to that tenant (single-tenant view).
 * - Without override → set `crossTenant = true` (platform-wide view).
 * Non-super_admin users always get `crossTenant = false`.
 */
@Injectable()
export class TenantOverrideInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) return next.handle();

    const tenantIdOverride = (request as unknown as Record<string, unknown>)._tenantOverride as string | undefined;

    if (user.roleSlug === 'super_admin') {
      if (tenantIdOverride) {
        user.tenantId = tenantIdOverride;
        user.buildingIds = [];
        user.crossTenant = false;
      } else {
        user.crossTenant = true;
      }
    } else {
      user.crossTenant = false;
    }

    return next.handle();
  }
}
