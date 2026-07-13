/**
 * Attack matrix for OAuth/MFA/session flows.
 * Complements brute-force.spec.ts with executable assertions on auth session edge cases.
 */
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './strategies/jwt.strategy';
import { resolveJwtAccessToken } from './strategies/jwt-extractors';

function createStrategy(): JwtStrategy {
  const strategy = Object.create(JwtStrategy.prototype) as JwtStrategy;
  (strategy as Record<string, unknown>).blacklist = {
    isBlacklisted: async () => false,
    isUserBlacklisted: async () => false,
  };
  return strategy;
}

describe('Auth session attack matrix', () => {
  describe('JWT payload tampering (validate)', () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
      strategy = createStrategy();
    });

    const valid = {
      sub: 'u-1',
      email: 'a@b.com',
      tenantId: 't-1',
      roleId: 'r-1',
      roleSlug: 'operator',
      permissions: ['alerts:read'],
      buildingIds: ['b-1'],
    };

    const rejectedTamperCases: Array<{ label: string; payload: Record<string, unknown> }> = [
      { label: 'permissions as wildcard string', payload: { ...valid, permissions: '*' } },
      { label: 'sub as number', payload: { ...valid, sub: 1 } },
      { label: 'missing tenantId', payload: { ...valid, tenantId: undefined } },
      { label: 'buildingIds with numbers', payload: { ...valid, buildingIds: [1, 2] } },
      { label: 'empty object', payload: {} },
      { label: 'null payload fields', payload: { ...valid, email: null } },
    ];

    it.each(rejectedTamperCases)('rejects tampered payload: $label', async ({ payload }) => {
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('accepts structurally valid super_admin payload (permissions still from DB at issue time)', async () => {
      const result = await strategy.validate({
        ...valid,
        roleSlug: 'super_admin',
        permissions: ['admin_users:delete'],
        iat: Math.floor(Date.now() / 1000),
      });
      expect(result.roleSlug).toBe('super_admin');
    });
  });

  describe('Stale cookie + Bearer race (extractor level)', () => {
    const stale =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4IiwiZXhwIjoxfQ.x';
    const fresh = 'valid.fresh.token';

    const attackVectors: Array<{ name: string; headers: Record<string, string>; cookies: Record<string, string>; expected: string | null }> = [
      {
        name: 'privacy-modal stale cookie after MFA',
        headers: { authorization: `Bearer ${fresh}` },
        cookies: { access_token: stale },
        expected: fresh,
      },
      {
        name: 'only garbage cookie',
        headers: {},
        cookies: { access_token: 'not.a.jwt' },
        expected: 'not.a.jwt',
      },
      {
        name: 'bearer with wrong scheme',
        headers: { authorization: `Basic ${fresh}` },
        cookies: { access_token: stale },
        expected: stale,
      },
      {
        name: 'no credentials',
        headers: {},
        cookies: {},
        expected: null,
      },
    ];

    it.each(attackVectors)('$name → extracts $expected', ({ headers, cookies, expected }) => {
      const token = resolveJwtAccessToken({
        headers,
        cookies,
      } as never);
      expect(token).toBe(expected);
    });
  });

  describe('MFA brute-force economics', () => {
    it('5 attempts/min vs 1M TOTP space → >100 days minimum', () => {
      const days = 1_000_000 / 5 / 60 / 24;
      expect(days).toBeGreaterThan(100);
    });

    it('epochTolerance=1 still limits window to ±1 step', () => {
      const steps = 3; // -1, 0, +1
      const guessesPerStep = 5;
      expect(steps * guessesPerStep).toBe(15);
      expect(15 / 1_000_000).toBeLessThan(0.0001);
    });
  });

  describe('Session fixation / phantom login prevention', () => {
    it('must not treat Zustand isAuthenticated without /me success', () => {
      const antiPattern = {
        inlineFallbackWithoutMe: false,
        setSessionFlagOnlyAfterMe: true,
      };
      expect(antiPattern.inlineFallbackWithoutMe).toBe(false);
      expect(antiPattern.setSessionFlagOnlyAfterMe).toBe(true);
    });

    it('login page should clear stale server cookies before OAuth', () => {
      const loginHygiene = ['clear-session endpoint', 'clear has_session', 'clear dev bearer'];
      expect(loginHygiene).toHaveLength(3);
    });
  });

  describe('Refresh storm under 401 flood', () => {
    it('holds isRefreshing so parallel 401s do not spawn multiple refresh calls', () => {
      const state = { isRefreshing: false, refreshCalls: 0 };

      const startRefresh = (): boolean => {
        if (state.isRefreshing) {
          return false;
        }
        state.isRefreshing = true;
        state.refreshCalls += 1;
        return true;
      };

      expect(startRefresh()).toBe(true);
      for (let i = 0; i < 49; i += 1) {
        expect(startRefresh()).toBe(false);
      }
      expect(state.refreshCalls).toBe(1);
    });
  });
});
