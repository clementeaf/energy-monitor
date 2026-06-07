/** Default multiplier when ingress_rate_limit_per_minute is unset on an API key. */
export const INGRESS_RATE_LIMIT_MULTIPLIER = 5;

/** Floor for computed ingress rate (req/min) when no explicit ingress limit is set. */
export const INGRESS_RATE_LIMIT_MIN = 300;

/**
 * Resolves effective rate limit for an API key request.
 * @param method - HTTP method
 * @param url - Request URL path
 * @param payload - Validated API key payload
 * @returns Requests per minute allowed
 */
export function resolveApiKeyRateLimit(
  method: string,
  url: string,
  payload: {
    _rateLimitPerMinute: number;
    _ingressRateLimitPerMinute: number | null;
  },
): number {
  const base = payload._rateLimitPerMinute ?? 60;
  const isIngress =
    method.toUpperCase() === 'POST' && url.includes('/v1/measurements');

  if (!isIngress) return base;

  if (payload._ingressRateLimitPerMinute != null) {
    return payload._ingressRateLimitPerMinute;
  }

  return Math.max(base * INGRESS_RATE_LIMIT_MULTIPLIER, INGRESS_RATE_LIMIT_MIN);
}
