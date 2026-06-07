import type { Request } from 'express';
import {
  extractAccessTokenFromCookie,
  jwtAccessTokenExtractors,
  resolveJwtAccessToken,
} from './jwt-extractors';
import { ExtractJwt } from 'passport-jwt';

function mockRequest(partial: {
  authorization?: string;
  cookies?: Record<string, string>;
}): Request {
  const headers: Record<string, string> = {};
  if (partial.authorization) {
    headers.authorization = partial.authorization;
  }
  return {
    headers,
    cookies: partial.cookies ?? {},
  } as unknown as Request;
}

describe('JWT extractors — violent session scenarios', () => {
  const staleCookieJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4IiwiZW1haWwiOiJhQGIuY29tIiwidGVuYW50SWQiOiJ0Iiwicm9sZUlkIjoiciIsInJvbGVTbHVnIjoiYSIsInBlcm1pc3Npb25zIjpbXSwiaWF0IjoxLCJleHAiOjJ9.x';
  const freshBearer = 'fresh-bearer-jwt-from-mfa-response';

  it('prefers Bearer over stale access_token cookie (local dev bug)', () => {
    const req = mockRequest({
      authorization: `Bearer ${freshBearer}`,
      cookies: { access_token: staleCookieJwt },
    });
    expect(resolveJwtAccessToken(req)).toBe(freshBearer);
  });

  it('prefers Bearer over __Host-access_token cookie', () => {
    const req = mockRequest({
      authorization: `Bearer ${freshBearer}`,
      cookies: { '__Host-access_token': staleCookieJwt },
    });
    expect(resolveJwtAccessToken(req)).toBe(freshBearer);
  });

  it('falls back to cookie when Authorization header is absent', () => {
    const req = mockRequest({ cookies: { access_token: 'cookie-only-token' } });
    expect(resolveJwtAccessToken(req)).toBe('cookie-only-token');
  });

  it('prefers __Host-access_token over plain access_token in cookie extractor', () => {
    const req = mockRequest({
      cookies: {
        '__Host-access_token': 'host-cookie',
        access_token: 'plain-cookie',
      },
    });
    expect(extractAccessTokenFromCookie(req)).toBe('host-cookie');
  });

  it('returns null when neither Bearer nor cookies exist', () => {
    expect(resolveJwtAccessToken(mockRequest({}))).toBeNull();
  });

  it('rejects malformed Bearer prefix and uses cookie', () => {
    const req = mockRequest({
      authorization: 'Token not-bearer',
      cookies: { access_token: 'fallback-cookie' },
    });
    expect(resolveJwtAccessToken(req)).toBe('fallback-cookie');
  });

  it('treats empty Bearer as absent and uses cookie', () => {
    const req = mockRequest({
      authorization: 'Bearer ',
      cookies: { access_token: 'cookie-wins' },
    });
    expect(resolveJwtAccessToken(req)).toBe('cookie-wins');
  });

  it('extractor order is exactly [Bearer, cookie]', () => {
    expect(jwtAccessTokenExtractors).toHaveLength(2);
    const probe = mockRequest({
      authorization: `Bearer ${freshBearer}`,
      cookies: { access_token: staleCookieJwt },
    });
    expect(jwtAccessTokenExtractors[0](probe)).toBe(freshBearer);
    expect(jwtAccessTokenExtractors[1](probe)).toBe(staleCookieJwt);
  });

  it('survives 100 rapid extractions without mutation', () => {
    const req = mockRequest({
      authorization: `Bearer ${freshBearer}`,
      cookies: { access_token: staleCookieJwt },
    });
    const extractor = ExtractJwt.fromExtractors(jwtAccessTokenExtractors);
    for (let i = 0; i < 100; i += 1) {
      expect(extractor(req)).toBe(freshBearer);
    }
  });

  it('handles concurrent-looking mixed credential payloads', () => {
    const cases: Array<{ req: Request; expected: string | null }> = [
      { req: mockRequest({ authorization: `Bearer a`, cookies: { access_token: 'b' } }), expected: 'a' },
      { req: mockRequest({ cookies: { access_token: 'only' } }), expected: 'only' },
      { req: mockRequest({ authorization: 'Bearer x' }), expected: 'x' },
      { req: mockRequest({ cookies: {} }), expected: null },
      {
        req: mockRequest({
          authorization: `Bearer ${'z'.repeat(4000)}`,
          cookies: { access_token: 'small' },
        }),
        expected: 'z'.repeat(4000),
      },
    ];
    for (const { req, expected } of cases) {
      expect(resolveJwtAccessToken(req)).toBe(expected);
    }
  });
});
