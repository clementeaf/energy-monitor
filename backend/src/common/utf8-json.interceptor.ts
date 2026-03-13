import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

const JSON_UTF8 = 'application/json; charset=utf-8';

/**
 * Ensures API JSON responses declare charset=utf-8 so browsers decode accents correctly.
 */
@Injectable()
export class Utf8JsonInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<{ setHeader: (name: string, value: string) => void }>();
    res.setHeader('Content-Type', JSON_UTF8);
    return next.handle();
  }
}
