import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';

const JSON_UTF8 = 'application/json; charset=utf-8';

/**
 * Ensures API JSON responses declare charset=utf-8 so browsers decode accents correctly.
 * Skips binary endpoints (e.g. PDF downloads) to avoid overriding their Content-Type.
 */
@Injectable()
export class Utf8JsonInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.path?.includes('/billing/pdf')) {
      const res = context.switchToHttp().getResponse<{ setHeader: (name: string, value: string) => void }>();
      res.setHeader('Content-Type', JSON_UTF8);
    }
    return next.handle();
  }
}
