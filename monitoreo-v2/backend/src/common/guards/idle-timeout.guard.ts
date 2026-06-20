import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { API_KEY_AUTH_FLAG } from './jwt-auth.guard';
import { getIdleTimeoutMinutes } from '../../lib/tenant-settings';

/**
 * CYB-06: Rejects requests from sessions idle longer than the tenant threshold.
 * Updates last_activity_at on every authenticated request that passes.
 *
 * Runs after JwtAuthGuard — user identity is available on request.
 * Skips @Public() routes and API-key-authenticated requests.
 */
@Injectable()
export class IdleTimeoutGuard implements CanActivate {
  private readonly logger = new Logger(IdleTimeoutGuard.name);

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
    if (request[API_KEY_AUTH_FLAG]) return true;

    const user = request.user;
    if (!user?.sub) return true; // no user context — let other guards handle

    // OAuth client tokens have no refresh token session — skip idle check
    if (typeof user.sub === 'string' && user.sub.startsWith('oauth:')) return true;

    const tenantSettings = await this.loadTenantSettings(user.tenantId);
    const idleMinutes = getIdleTimeoutMinutes(tenantSettings);

    const isIdle = await this.checkAndTouch(user.sub, idleMinutes);
    if (!isIdle) return true;

    // Session idle — revoke all tokens for this user
    await this.revokeAllTokens(user.sub);
    this.logger.warn(`Idle timeout (${idleMinutes}min) — session revoked for user ${user.sub}`);
    throw new UnauthorizedException('Session expired due to inactivity.');
  }

  /**
   * Atomically checks idle status and updates last_activity_at.
   * Returns true when the session IS idle (should be rejected).
   *
   * Single query: UPDATE only rows where last_activity_at is within threshold.
   * If no rows updated → session was idle (or no active token exists).
   */
  private async checkAndTouch(userId: string, idleMinutes: number): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE refresh_tokens
       SET last_activity_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
         AND last_activity_at > NOW() - make_interval(mins => $2)
       RETURNING id`,
      [userId, idleMinutes],
    );
    return result.length === 0;
  }

  private async revokeAllTokens(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), revoked_reason = 'idle_timeout'
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  private async loadTenantSettings(tenantId: string): Promise<Record<string, unknown> | null> {
    if (!tenantId) return null;
    const rows = await this.dataSource.query(
      `SELECT settings FROM tenants WHERE id = $1`,
      [tenantId],
    );
    return rows[0]?.settings ?? null;
  }
}
