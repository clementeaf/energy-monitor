import { INGRESS_RATE_LIMIT_MIN, INGRESS_RATE_LIMIT_MULTIPLIER, resolveApiKeyRateLimit } from './ingress-rate-limit';

describe('resolveApiKeyRateLimit', () => {
  const basePayload = {
    _rateLimitPerMinute: 60,
    _ingressRateLimitPerMinute: null as number | null,
  };

  it('returns base limit for non-ingress routes', () => {
    expect(resolveApiKeyRateLimit('GET', '/v1/readings', basePayload)).toBe(60);
  });

  it('uses explicit ingress limit for POST /v1/measurements', () => {
    expect(
      resolveApiKeyRateLimit('POST', '/v1/measurements', {
        ...basePayload,
        _ingressRateLimitPerMinute: 1200,
      }),
    ).toBe(1200);
  });

  it('applies multiplier floor for ingress without explicit limit', () => {
    const computed = Math.max(
      basePayload._rateLimitPerMinute * INGRESS_RATE_LIMIT_MULTIPLIER,
      INGRESS_RATE_LIMIT_MIN,
    );
    expect(resolveApiKeyRateLimit('POST', '/v1/measurements', basePayload)).toBe(computed);
  });
});
