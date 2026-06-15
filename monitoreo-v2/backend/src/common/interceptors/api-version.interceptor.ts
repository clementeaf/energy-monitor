import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';

export const API_VERSION = '1.0';

/** Metadata key for deprecated endpoints. */
export const DEPRECATION_KEY = 'api:deprecation';

/** Marks an endpoint as deprecated with optional sunset date. */
export interface DeprecationMeta {
  /** ISO date string when the endpoint will be removed (e.g., '2027-01-01'). */
  sunset?: string;
  /** Human-readable notice. */
  notice?: string;
}

/**
 * Decorator: marks a controller method as deprecated.
 * The interceptor reads this and sets Deprecation + Sunset response headers.
 */
export function ApiDeprecated(meta: DeprecationMeta = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(DEPRECATION_KEY, meta, descriptor.value!);
    return descriptor;
  };
}

/**
 * INT-06: Adds API-Version header to every response.
 * For deprecated endpoints, also sets Deprecation and Sunset headers (RFC 8594).
 */
@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response: Response = context.switchToHttp().getResponse();
    response.setHeader('API-Version', API_VERSION);

    const deprecation = this.reflector.get<DeprecationMeta | undefined>(
      DEPRECATION_KEY,
      context.getHandler(),
    );

    if (deprecation) {
      response.setHeader('Deprecation', 'true');
      if (deprecation.sunset) {
        response.setHeader('Sunset', deprecation.sunset);
      }
      if (deprecation.notice) {
        response.setHeader('X-Deprecation-Notice', deprecation.notice);
      }
    }

    return next.handle().pipe(
      tap(() => {
        // Headers already set — tap ensures they persist after handler
      }),
    );
  }
}
