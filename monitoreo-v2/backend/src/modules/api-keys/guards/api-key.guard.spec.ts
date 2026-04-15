import { ExecutionContext, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { API_KEY_AUTH_FLAG } from '../../../common/guards/jwt-auth.guard';
import type { ApiKeysService, ValidatedApiKeyPayload } from '../api-keys.service';

function createMockContext(headers: Record<string, string> = {}) {
  const request: Record<string, unknown> = { headers, user: undefined };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { context, request };
}

const validPayload: ValidatedApiKeyPayload = {
  sub: 'apikey:ak-1',
  email: 'apikey-emk_abcd@system',
  tenantId: 't-1',
  roleId: 'api_key',
  roleSlug: 'api_key',
  permissions: ['buildings:read'],
  buildingIds: [],
  _apiKeyId: 'ak-1',
  _rateLimitPerMinute: 60,
};

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let service: { validate: jest.Mock };
  let reflector: Reflector;

  beforeEach(() => {
    service = { validate: jest.fn() };
    reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    guard = new ApiKeyGuard(service as unknown as ApiKeysService, reflector);
  });

  it('passes through when no X-API-Key header', async () => {
    const { context, request } = createMockContext({});
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request.user).toBeUndefined();
    expect(request[API_KEY_AUTH_FLAG]).toBeUndefined();
  });

  it('passes through for @Public() endpoints', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const { context } = createMockContext({ 'x-api-key': 'emk_test' });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(service.validate).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException for invalid API key', async () => {
    service.validate.mockResolvedValue(null);
    const { context } = createMockContext({ 'x-api-key': 'emk_invalid' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('sets request.user and flag for valid API key', async () => {
    service.validate.mockResolvedValue(validPayload);
    const { context, request } = createMockContext({ 'x-api-key': 'emk_validkey' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(validPayload);
    expect(request[API_KEY_AUTH_FLAG]).toBe(true);
  });

  /* --- Rate limiting --- */

  it('allows requests within rate limit', async () => {
    service.validate.mockResolvedValue({ ...validPayload, _rateLimitPerMinute: 5 });

    for (let i = 0; i < 5; i++) {
      const { context } = createMockContext({ 'x-api-key': 'emk_key' });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
  });

  it('throws 429 when rate limit exceeded', async () => {
    service.validate.mockResolvedValue({ ...validPayload, _rateLimitPerMinute: 3 });

    // First 3 succeed
    for (let i = 0; i < 3; i++) {
      const { context } = createMockContext({ 'x-api-key': 'emk_key' });
      await guard.canActivate(context);
    }

    // 4th exceeds limit
    const { context } = createMockContext({ 'x-api-key': 'emk_key' });
    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('different API keys have independent rate counters', async () => {
    const payload1 = { ...validPayload, _apiKeyId: 'ak-1', _rateLimitPerMinute: 2 };
    const payload2 = { ...validPayload, _apiKeyId: 'ak-2', _rateLimitPerMinute: 2 };

    // 2 requests for key 1
    service.validate.mockResolvedValue(payload1);
    for (let i = 0; i < 2; i++) {
      const { context } = createMockContext({ 'x-api-key': 'emk_key1' });
      await guard.canActivate(context);
    }

    // Key 2 should still work
    service.validate.mockResolvedValue(payload2);
    const { context } = createMockContext({ 'x-api-key': 'emk_key2' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
