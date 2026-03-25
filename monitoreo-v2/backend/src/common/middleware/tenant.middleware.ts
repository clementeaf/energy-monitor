import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
  tenantId?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: Response, next: NextFunction): void {
    // Tenant is resolved exclusively from JWT payload after authentication.
    // The x-tenant-id header is NOT accepted from clients to prevent spoofing.
    // Tenant will be set by the JWT strategy via req.user.tenantId.
    next();
  }
}
