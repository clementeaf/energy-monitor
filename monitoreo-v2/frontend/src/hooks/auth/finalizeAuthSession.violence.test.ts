import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MeResponse } from '../../types/auth';

const meMock = vi.fn();
const refreshMock = vi.fn();
const setDevBearerTokenMock = vi.fn();
const clearDevBearerTokenMock = vi.fn();

vi.mock('../../services/endpoints', () => ({
  authEndpoints: {
    me: () => meMock(),
    refresh: () => refreshMock(),
  },
}));

vi.mock('../../services/api', () => ({
  setDevBearerToken: (token: string | null) => setDevBearerTokenMock(token),
  clearDevBearerToken: () => clearDevBearerTokenMock(),
}));

import { captureDevAccessToken, finalizeAuthSession } from './finalizeAuthSession';

const mePayload: MeResponse = {
  user: {
    id: 'u-1',
    email: 'a@b.com',
    displayName: 'Test',
    role: { id: 'r-1', slug: 'super_admin', name: 'Super Admin' },
    permissions: ['dashboard_executive:read'],
    buildingIds: [],
    authProvider: 'microsoft',
    lastLoginAt: null,
    privacyAccepted: false,
    requireMfaSetup: false,
    dataProcessingBlocked: false,
    optOutAutomatedDecisions: false,
  },
  tenant: {
    primaryColor: '#000',
    secondaryColor: '#111',
    sidebarColor: '#222',
    accentColor: '#333',
    appTitle: 'Test',
    logoUrl: null,
    faviconUrl: null,
  },
};

describe('finalizeAuthSession — violent scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores dev bearer immediately from MFA payload', () => {
    captureDevAccessToken({ accessToken: 'tok-abc' });
    expect(setDevBearerTokenMock).toHaveBeenCalledWith('tok-abc');
  });

  it('succeeds on first /me when bearer is ready', async () => {
    meMock.mockResolvedValue({ data: mePayload });
    const applyMeResponse = vi.fn();
    const onFailure = vi.fn();

    const promise = finalizeAuthSession({
      authData: { accessToken: 'tok-1', ...mePayload },
      applyMeResponse,
      onFailure,
    });
    await promise;

    expect(applyMeResponse).toHaveBeenCalledWith(mePayload);
    expect(onFailure).not.toHaveBeenCalled();
    expect(meMock).toHaveBeenCalledTimes(1);
  });

  it('retries /me up to 4 times before refresh fallback', async () => {
    meMock
      .mockRejectedValueOnce(new Error('401'))
      .mockRejectedValueOnce(new Error('401'))
      .mockRejectedValueOnce(new Error('401'))
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValueOnce({ data: mePayload });

    refreshMock.mockResolvedValue({ data: { accessToken: 'tok-refresh' } });

    const applyMeResponse = vi.fn();
    const run = finalizeAuthSession({
      authData: { accessToken: 'tok-1' },
      applyMeResponse,
      onFailure: vi.fn(),
    });

    await vi.runAllTimersAsync();
    await run;

    expect(meMock.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(refreshMock).toHaveBeenCalled();
    expect(applyMeResponse).toHaveBeenCalledWith(mePayload);
  });

  it('fails closed: clears bearer and does NOT authenticate without /me', async () => {
    meMock.mockRejectedValue(new Error('401'));
    refreshMock.mockRejectedValue(new Error('401'));

    const applyMeResponse = vi.fn();
    const onFailure = vi.fn();

    const run = finalizeAuthSession({
      authData: { accessToken: 'tok-dead', user: mePayload.user, tenant: mePayload.tenant },
      applyMeResponse,
      onFailure,
    });

    const expectation = expect(run).rejects.toThrow('auth_session_failed');
    await vi.runAllTimersAsync();
    await expectation;

    expect(applyMeResponse).not.toHaveBeenCalled();
    expect(clearDevBearerTokenMock).toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith(expect.stringContaining('No se pudo guardar la sesión'));
  });

  it('never calls applyMeResponse when accessToken missing and all probes fail', async () => {
    meMock.mockRejectedValue(new Error('401'));
    refreshMock.mockRejectedValue(new Error('401'));
    const applyMeResponse = vi.fn();

    const run = finalizeAuthSession({ applyMeResponse, onFailure: vi.fn() });
    const expectation = expect(run).rejects.toThrow('auth_session_failed');
    await vi.runAllTimersAsync();
    await expectation;

    expect(applyMeResponse).not.toHaveBeenCalled();
  });
});
