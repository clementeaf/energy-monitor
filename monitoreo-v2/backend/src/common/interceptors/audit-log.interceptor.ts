import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
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

    return next.handle().pipe(
      tap(async () => {
        try {
          await this.dataSource.query(
            `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)`,
            [
              user?.tenantId ?? null,
              user?.sub ?? null,
              `${method} ${request.route?.path ?? request.url}`,
              context.getClass().name.replace('Controller', ''),
              request.params?.id ?? null,
              JSON.stringify({
                statusCode: context.switchToHttp().getResponse().statusCode,
                duration: Date.now() - startTime,
              }),
              request.ip ?? null,
              request.headers['user-agent'] ?? null,
            ],
          );
        } catch (error: unknown) {
          this.logger.warn(
            `Audit log write failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        }
      }),
    );
  }
}
