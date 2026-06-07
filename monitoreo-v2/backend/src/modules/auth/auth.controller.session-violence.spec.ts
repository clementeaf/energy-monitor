import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { TenantsService } from '../tenants/tenants.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({})),
  jwtVerify: jest.fn(),
}));

jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verifySync: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function createResponseMock(): {
  res: { cookie: jest.Mock; clearCookie: jest.Mock };
  cookies: CookieCall[];
  cleared: string[];
} {
  const cookies: CookieCall[] = [];
  const cleared: string[] = [];
  const res = {
    cookie: jest.fn((name: string, value: string, options: Record<string, unknown>) => {
      cookies.push({ name, value, options });
    }),
    clearCookie: jest.fn((name: string) => {
      cleared.push(name);
    }),
  };
  return { res, cookies, cleared };
}

describe('AuthController — violent session/cookie scenarios', () => {
  let controller: AuthController;
  let authService: Record<string, jest.Mock>;
  let mfaService: Record<string, jest.Mock>;
  let configGet: jest.Mock;

  beforeEach(async () => {
    authService = {
      acceptPrivacyPolicy: jest.fn().mockResolvedValue(undefined),
      issueTokensForUser: jest.fn().mockResolvedValue({
        accessToken: 'new-access-jwt',
        refreshToken: 'new-refresh-token',
      }),
      getMeResponse: jest.fn().mockResolvedValue({
        user: { id: 'u-1', email: 'a@b.com', privacyAccepted: false },
        tenant: { appTitle: 'Energy Monitor' },
      }),
      revokeAllTokens: jest.fn(),
    };
    mfaService = {
      validate: jest.fn(),
    };
    configGet = jest.fn((key: string) => {
      if (key === 'MICROSOFT_TENANT_ID') return 'tenant-id';
      if (key === 'NODE_ENV') return 'development';
      return undefined;
    });

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MfaService, useValue: mfaService },
        { provide: TenantsService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: configGet, getOrThrow: (k: string) => configGet(k) },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('clear-session wipes access and refresh cookies', async () => {
    const { res, cleared } = createResponseMock();
    const result = await controller.clearSessionCookies(res as never);
    expect(result).toEqual({ success: true });
    expect(cleared).toContain('access_token');
    expect(cleared).toContain('refresh_token');
  });

  it('mfa/validate rejects invalid code with 401', async () => {
    mfaService.validate.mockResolvedValue(false);
    const { res } = createResponseMock();
    await expect(
      controller.mfaValidate({ userId: 'u-1', code: '000000' }, res as never),
    ).rejects.toThrow(UnauthorizedException);
    expect(authService.issueTokensForUser).not.toHaveBeenCalled();
  });

  it('mfa/validate clears old cookies before issuing new ones', async () => {
    mfaService.validate.mockResolvedValue(true);
    const { res, cookies, cleared } = createResponseMock();

    await controller.mfaValidate({ userId: 'u-1', code: '123456' }, res as never);

    expect(cleared).toContain('access_token');
    expect(cleared).toContain('refresh_token');
    const accessCookie = cookies.find((c) => c.name === 'access_token');
    const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
    expect(accessCookie?.value).toBe('new-access-jwt');
    expect(refreshCookie?.value).toBe('new-refresh-token');
    expect(accessCookie?.options.httpOnly).toBe(true);
    expect(accessCookie?.options.sameSite).toBe('lax');
  });

  it('mfa/validate exposes accessToken in body only in development', async () => {
    mfaService.validate.mockResolvedValue(true);
    const { res } = createResponseMock();

    const devResult = await controller.mfaValidate({ userId: 'u-1', code: '123456' }, res as never);
    expect(devResult.accessToken).toBe('new-access-jwt');

    configGet.mockImplementation((key: string) => {
      if (key === 'MICROSOFT_TENANT_ID') return 'tenant-id';
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });
    const prodModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MfaService, useValue: mfaService },
        { provide: TenantsService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: configGet, getOrThrow: (k: string) => configGet(k) },
        },
      ],
    }).compile();
    const prodController = prodModule.get(AuthController);
    const prodRes = createResponseMock();
    const prodResult = await prodController.mfaValidate(
      { userId: 'u-1', code: '123456' },
      prodRes.res as never,
    );
    expect(prodResult.accessToken).toBeUndefined();
  });

  it('accept-privacy delegates to service with authenticated user id', async () => {
    await controller.acceptPrivacy({
      sub: 'u-1',
      email: 'a@b.com',
      tenantId: 't-1',
      roleId: 'r-1',
      roleSlug: 'super_admin',
      permissions: [],
      buildingIds: [],
      crossTenant: false,
    });
    expect(authService.acceptPrivacyPolicy).toHaveBeenCalledWith('u-1');
  });

  it('production cookies use __Host- prefix and strict sameSite', async () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'MICROSOFT_TENANT_ID') return 'tenant-id';
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });
    mfaService.validate.mockResolvedValue(true);

    const prodModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MfaService, useValue: mfaService },
        { provide: TenantsService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: configGet, getOrThrow: (k: string) => configGet(k) },
        },
      ],
    }).compile();
    const prodController = prodModule.get(AuthController);
    const { res, cookies, cleared } = createResponseMock();

    await prodController.mfaValidate({ userId: 'u-1', code: '123456' }, res as never);

    expect(cleared).toContain('__Host-access_token');
    expect(cookies.some((c) => c.name === '__Host-access_token')).toBe(true);
    const hostCookie = cookies.find((c) => c.name === '__Host-access_token');
    expect(hostCookie?.options.secure).toBe(true);
    expect(hostCookie?.options.sameSite).toBe('strict');
  });
});
