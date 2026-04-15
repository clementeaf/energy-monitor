import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { API_KEY_AUTH_FLAG } from '../../../common/guards/jwt-auth.guard';
import { ApiKeysService } from '../api-keys.service';

const API_KEY_HEADER = 'x-api-key';

interface RateWindow {
  count: number;
  windowStart: number;
}

/**
 * Global guard that runs BEFORE JwtAuthGuard.
 * If the request contains an X-API-Key header, validates it,
 * checks per-key rate limits, and injects a JwtPayload-compatible object.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  /** In-memory rate counters per API key ID. */
  private readonly rateLimits = new Map<string, RateWindow>();

  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Skip for @Public() endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Only activate when X-API-Key header is present
    const rawKey = request.headers[API_KEY_HEADER] as string | undefined;
    if (!rawKey) return true; // No API key → let JwtAuthGuard handle

    const payload = await this.apiKeysService.validate(rawKey);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Enforce per-key rate limit
    this.checkRateLimit(payload._apiKeyId, payload._rateLimitPerMinute ?? 60);

    // Inject JwtPayload-compatible user + flag for JwtAuthGuard
    request.user = payload;
    request[API_KEY_AUTH_FLAG] = true;

    return true;
  }

  /** Check and increment rate counter. Throws 429 if exceeded. */
  private checkRateLimit(keyId: string, limitPerMinute: number): void {
    const now = Date.now();
    const windowMs = 60_000;

    // Periodic cleanup of stale windows (prevents unbounded memory growth)
    if (this.rateLimits.size > 1000) {
      for (const [key, w] of this.rateLimits) {
        if (now - w.windowStart > 2 * windowMs) this.rateLimits.delete(key);
      }
    }

    let window = this.rateLimits.get(keyId);
    if (!window || now - window.windowStart >= windowMs) {
      // Start new window
      window = { count: 1, windowStart: now };
      this.rateLimits.set(keyId, window);
      return;
    }

    window.count++;
    if (window.count > limitPerMinute) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `API key rate limit exceeded (${limitPerMinute}/min)`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
