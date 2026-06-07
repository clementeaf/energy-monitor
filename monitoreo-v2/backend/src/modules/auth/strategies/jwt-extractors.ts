import { ExtractJwt } from 'passport-jwt';
import type { Request } from 'express';

/**
 * Reads access JWT from httpOnly cookies (__Host- in prod, plain in dev).
 */
export function extractAccessTokenFromCookie(req: Request): string | null {
  return (
    req?.cookies?.['__Host-access_token'] ??
    req?.cookies?.['access_token'] ??
    null
  );
}

/**
 * Ordered extractors: Bearer header first (dev stale-cookie bypass), then cookie.
 */
export const jwtAccessTokenExtractors = [
  ExtractJwt.fromAuthHeaderAsBearerToken(),
  extractAccessTokenFromCookie,
];

/**
 * Resolves which raw JWT string passport-jwt would use for a request.
 */
export function resolveJwtAccessToken(req: Request): string | null {
  return ExtractJwt.fromExtractors(jwtAccessTokenExtractors)(req);
}
