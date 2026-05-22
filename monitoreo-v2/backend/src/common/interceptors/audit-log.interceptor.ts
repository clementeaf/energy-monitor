import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { DataSource } from 'typeorm';
import type { JwtPayload } from '../decorators/current-user.decorator';

/** GET paths that access personal data — must be audited for Ley 21.719 traceability. */
const SENSITIVE_GET_PATHS = [
  '/auth/me/export',
  '/audit-logs',
  '/deletion-requests',
  '/admin/breach-reports',
  '/privacy/processing-registry',
];

/** Fields to redact from audit body (passwords, tokens, secrets). */
const REDACTED_FIELDS = new Set([
  'password', 'secret', 'token', 'idToken', 'accessToken',
  'refreshToken', 'mfaSecret', 'configJson', 'apiKey',
]);

function sanitizeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (REDACTED_FIELDS.has(key)) {
      safe[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 500) {
      safe[key] = value.substring(0, 500) + '…';
    } else {
      safe[key] = value;
    }
  }
  return Object.keys(safe).length > 0 ? safe : null;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (['HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    // Skip non-sensitive GETs
    if (method === 'GET') {
      const path = (request.route?.path ?? request.url) as string;
      const isSensitive = SENSITIVE_GET_PATHS.some((p) => path.includes(p));
      if (!isSensitive) return next.handle();
    }

    const user = request.user as JwtPayload | undefined;
    const startTime = Date.now();
    const routePath = request.route?.path ?? request.url;
    const body = sanitizeBody(request.body);

    const writeLog = async (statusCode: number, error?: string) => {
      try {
        await this.dataSource.query(
          `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)`,
          [
            user?.tenantId ?? null,
            user?.sub ?? null,
            `${method} ${routePath}`,
            context.getClass().name.replace('Controller', ''),
            request.params?.id ?? null,
            JSON.stringify({
              statusCode,
              duration: Date.now() - startTime,
              ...(body ? { body } : {}),
              ...(error ? { error } : {}),
              ...(request.query && Object.keys(request.query).length > 0 ? { query: request.query } : {}),
            }),
            request.ip ?? null,
            request.headers['user-agent'] ?? null,
          ],
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Audit log write failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        );
      }
    };

    return next.handle().pipe(
      tap(() => writeLog(context.switchToHttp().getResponse().statusCode)),
      catchError((err) => {
        const status = err?.status ?? err?.getStatus?.() ?? 500;
        writeLog(status, err?.message ?? 'unknown');
        throw err;
      }),
    );
  }
}
