import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Extracts `?tenantId=` from query params and stashes it on `request._tenantOverride`.
 * Removes it from `query` so downstream DTOs with `whitelist: true` don't reject it.
 * The interceptor later applies the override to `request.user`.
 */
@Injectable()
export class TenantOverrideMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.query.tenantId as string | undefined;
    if (tenantId) {
      (req as unknown as Record<string, unknown>)._tenantOverride = tenantId;
      delete req.query.tenantId;
    }
    next();
  }
}
