import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { DataSource } from 'typeorm';
import type { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
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
        } catch {
          // Audit failure must not break the request
        }
      }),
    );
  }
}
