import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IdleTimeoutGuard } from './idle-timeout.guard';
import { API_KEY_AUTH_FLAG } from './jwt-auth.guard';

describe('IdleTimeoutGuard', () => {
  let guard: IdleTimeoutGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let ds: { query: jest.Mock };

  const buildContext = (
    user?: { sub: string; tenantId: string },
    apiKey = false,
  ): ExecutionContext => {
    const req: Record<string, unknown> = {};
    if (user) req.user = user;
    if (apiKey) req[API_KEY_AUTH_FLAG] = true;
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    ds = { query: jest.fn() };
    guard = new IdleTimeoutGuard(
      reflector as unknown as Reflector,
      ds as any,
    );
  });

  it('allows @Public() routes without checking', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const result = await guard.canActivate(buildContext());
    expect(result).toBe(true);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('allows API key authenticated requests without checking', async () => {
    const result = await guard.canActivate(buildContext(undefined, true));
    expect(result).toBe(true);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('allows requests without user context', async () => {
    const result = await guard.canActivate(buildContext());
    expect(result).toBe(true);
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('allows active session and touches last_activity_at', async () => {
    // tenant settings query
    ds.query.mockResolvedValueOnce([{ settings: { idleTimeoutMinutes: 15 } }]);
    // checkAndTouch — returns rows (session is active)
    ds.query.mockResolvedValueOnce([{ id: 'rt-1' }]);

    const result = await guard.canActivate(
      buildContext({ sub: 'a0000000-0000-0000-0000-000000000001', tenantId: 't-1' }),
    );

    expect(result).toBe(true);
    expect(ds.query).toHaveBeenCalledTimes(2);
    // Verify the UPDATE query uses make_interval
    const updateCall = ds.query.mock.calls[1];
    expect(updateCall[0]).toContain('UPDATE refresh_tokens');
    expect(updateCall[0]).toContain('make_interval');
    expect(updateCall[1]).toEqual(['a0000000-0000-0000-0000-000000000001', 15]);
  });

  it('rejects idle session and revokes tokens', async () => {
    // tenant settings — default idle timeout
    ds.query.mockResolvedValueOnce([{ settings: {} }]);
    // checkAndTouch — returns empty (session is idle)
    ds.query.mockResolvedValueOnce([]);
    // revokeAllTokens
    ds.query.mockResolvedValueOnce(undefined);

    await expect(
      guard.canActivate(buildContext({ sub: 'a0000000-0000-0000-0000-000000000001', tenantId: 't-1' })),
    ).rejects.toThrow(UnauthorizedException);

    // Verify revoke query was called
    const revokeCall = ds.query.mock.calls[2];
    expect(revokeCall[0]).toContain('idle_timeout');
    expect(revokeCall[1]).toEqual(['a0000000-0000-0000-0000-000000000001']);
  });

  it('uses custom idle timeout from tenant settings', async () => {
    ds.query.mockResolvedValueOnce([{ settings: { idleTimeoutMinutes: 30 } }]);
    ds.query.mockResolvedValueOnce([{ id: 'rt-1' }]);

    await guard.canActivate(buildContext({ sub: 'a0000000-0000-0000-0000-000000000001', tenantId: 't-1' }));

    const updateCall = ds.query.mock.calls[1];
    expect(updateCall[1]).toEqual(['a0000000-0000-0000-0000-000000000001', 30]);
  });

  it('defaults to 15 minutes when tenant has no settings', async () => {
    ds.query.mockResolvedValueOnce([]); // no tenant found
    ds.query.mockResolvedValueOnce([{ id: 'rt-1' }]);

    await guard.canActivate(buildContext({ sub: 'a0000000-0000-0000-0000-000000000001', tenantId: 't-1' }));

    const updateCall = ds.query.mock.calls[1];
    expect(updateCall[1]).toEqual(['a0000000-0000-0000-0000-000000000001', 15]);
  });

  it('handles missing tenantId gracefully', async () => {
    ds.query.mockResolvedValueOnce([{ id: 'rt-1' }]);

    const ctx = buildContext({ sub: 'a0000000-0000-0000-0000-000000000001', tenantId: '' });
    // loadTenantSettings returns null for empty tenantId
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
