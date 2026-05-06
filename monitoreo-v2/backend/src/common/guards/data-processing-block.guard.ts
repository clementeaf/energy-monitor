import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtPayload } from '../decorators/current-user.decorator';

/**
 * Guard: Ley 21.719 Art. 8 ter — blocks data access when user has exercised
 * their right of opposition or requested temporary processing suspension.
 *
 * Returns HTTP 451 (Unavailable For Legal Reasons) on data endpoints.
 *
 * Allowed paths when blocked:
 * - /auth/* (login, logout, me, privacy acceptance, ARCO+ actions)
 * - /privacy/* (public policy + registry)
 * - /deletion-requests (admin managing requests)
 */
const ALLOWED_WHEN_BLOCKED = [
  '/auth/',
  '/privacy/',
  '/health',
];

@Injectable()
export class DataProcessingBlockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user?.sub) return true;

    // Allow auth/privacy paths even when blocked
    const path = (request.route?.path ?? request.url) as string;
    if (ALLOWED_WHEN_BLOCKED.some((p) => path.startsWith(p))) return true;

    // Check DB for block status (cached per request via flag)
    if (request._blockChecked !== undefined) {
      if (request._blockChecked) {
        throw new HttpException(
          { statusCode: 451, message: 'Procesamiento de datos suspendido por ejercicio de derecho ARCO+ (Ley 21.719). Contacte a su administrador.' },
          451,
        );
      }
      return true;
    }

    const rows = await this.dataSource.query(
      `SELECT data_processing_blocked FROM users WHERE id = $1`,
      [user.sub],
    );

    const blocked = rows.length > 0 && rows[0].data_processing_blocked === true;
    request._blockChecked = blocked;

    if (blocked) {
      throw new HttpException(
        { statusCode: 451, message: 'Procesamiento de datos suspendido por ejercicio de derecho ARCO+ (Ley 21.719). Contacte a su administrador.' },
        451,
      );
    }

    return true;
  }
}
