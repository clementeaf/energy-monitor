import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RolesService } from '../roles/roles.service';
import { TenantsService } from '../tenants/tenants.service';
import { JwtBlacklistService } from './jwt-blacklist.service';

describe('AuthService', () => {
  let service: AuthService;
  let ds: { query: jest.Mock; createQueryRunner: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let rolesService: Record<string, jest.Mock>;
  let tenantsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    ds = {
      query: jest.fn(),
      createQueryRunner: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('jwt-token') };
    rolesService = {
      getPermissionsByRoleId: jest.fn().mockResolvedValue([]),
      getUserBuildingIds: jest.fn().mockResolvedValue([]),
      getRoleByUserId: jest.fn().mockResolvedValue({ maxSessionMinutes: 30 }),
    };
    tenantsService = {
      findById: jest.fn().mockResolvedValue({ id: 't-1', settings: {} }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: DataSource, useValue: ds },
        { provide: RolesService, useValue: rolesService },
        { provide: TenantsService, useValue: tenantsService },
        { provide: JwtBlacklistService, useValue: { blacklistUser: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('getUserProfile', () => {
    it('returns profile with permissions and buildings', async () => {
      ds.query
        .mockResolvedValueOnce([{
          id: 'u-1', email: 'a@b.com', display_name: 'Test',
          role_id: 'r-1', role_slug: 'operator', role_name: 'Operador',
          auth_provider: 'google', last_login_at: null,
        }])
        .mockResolvedValueOnce([]); // getUserBuildings

      rolesService.getPermissionsByRoleId.mockResolvedValue([
        { module: 'alerts', action: 'read' },
      ]);

      const profile = await service.getUserProfile('u-1');

      expect(profile.email).toBe('a@b.com');
      expect(profile.role.slug).toBe('operator');
      expect(profile.permissions).toEqual(['alerts:read']);
      expect(profile.buildingIds).toEqual([]);
    });

    it('throws NotFoundException for missing user', async () => {
      ds.query.mockResolvedValue([]);
      await expect(service.getUserProfile('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateOAuthLogin', () => {
    const profile = {
      provider: 'google' as const,
      providerId: 'gid-1',
      email: 'a@b.com',
      displayName: 'Test',
    };

    it('returns token pair for existing user', async () => {
      ds.query
        .mockResolvedValueOnce([{ id: 'u-1', tenant_id: 't-1', email: 'a@b.com', role_id: 'r-1', is_active: true, role_slug: 'operator' }])
        .mockResolvedValueOnce(undefined) // UPDATE last_login
        .mockResolvedValueOnce([{ mfa_enabled: false }]) // MFA check
        .mockResolvedValueOnce(undefined); // INSERT refresh_token

      const result = await service.validateOAuthLogin(profile);

      expect((result as any).accessToken).toBe('jwt-token');
      expect((result as any).refreshToken).toBeDefined();
    });

    it('falls back to email match and links provider', async () => {
      ds.query
        .mockResolvedValueOnce([]) // no provider match
        .mockResolvedValueOnce([{ id: 'u-1', tenant_id: 't-1', email: 'a@b.com', role_id: 'r-1', is_active: true, role_slug: 'operator' }]) // email match
        .mockResolvedValueOnce(undefined) // UPDATE link provider
        .mockResolvedValueOnce(undefined) // UPDATE last_login
        .mockResolvedValueOnce([{ mfa_enabled: false }]) // MFA check
        .mockResolvedValueOnce(undefined); // INSERT refresh_token

      const result = await service.validateOAuthLogin(profile);
      expect((result as any).accessToken).toBe('jwt-token');
    });

    it('throws UnauthorizedException for unknown user', async () => {
      ds.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      await expect(service.validateOAuthLogin(profile)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for inactive user', async () => {
      ds.query.mockResolvedValueOnce([{ id: 'u-1', tenant_id: 't-1', email: 'a@b.com', role_id: 'r-1', is_active: false, role_slug: 'operator' }]);
      await expect(service.validateOAuthLogin(profile)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeAllTokens', () => {
    it('calls update query', async () => {
      ds.query.mockResolvedValue(undefined);
      await service.revokeAllTokens('u-1');
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('revoked_at'),
        ['u-1'],
      );
    });
  });

  describe('validateSsoLogin', () => {
    const ssoProfile = {
      provider: 'oidc' as const,
      providerId: 'oidc-sub-1',
      email: 'sso@example.com',
      displayName: 'SSO User',
      tenantId: 't-1',
    };

    it('JIT provisions user when not found', async () => {
      ds.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'role-1' }])
        .mockResolvedValueOnce([{ id: 'u-new' }])
        .mockResolvedValueOnce([{
          id: 'u-new', tenant_id: 't-1', email: 'sso@example.com', role_id: 'r-1',
          is_active: true, role_slug: 'operator', require_mfa: false,
        }])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([{ mfa_enabled: false }])
        .mockResolvedValueOnce(undefined);

      tenantsService.findById.mockResolvedValue({ id: 't-1', settings: { ssoDefaultRoleSlug: 'operator' } });

      const result = await service.validateSsoLogin(ssoProfile);
      expect((result as { accessToken: string }).accessToken).toBe('jwt-token');
    });
  });

  describe('generateTokenPair', () => {
    const payload = { sub: 'u-1', tenantId: 't-1', email: 'a@b.com', roleSlug: 'operator', buildingIds: [], permissions: [], crossTenant: false };

    it('uses sessionMinutes for refresh token expiry instead of hardcoded 7 days', async () => {
      ds.query.mockResolvedValue(undefined);

      await service.generateTokenPair(payload, 60); // 60 minutes

      const insertCall = ds.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO refresh_tokens'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![0]).toContain('$3');
      expect(insertCall![1]).toHaveLength(3);
      expect(insertCall![1][2]).toBe(60);
    });

    it('defaults to 1440 minutes (24h) when sessionMinutes not provided', async () => {
      ds.query.mockResolvedValue(undefined);

      await service.generateTokenPair(payload);

      const insertCall = ds.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO refresh_tokens'),
      );
      expect(insertCall![1][2]).toBe(1440);
    });
  });

  describe('getUserBuildings', () => {
    it('returns building refs', async () => {
      ds.query.mockResolvedValue([{ id: 'b-1', name: 'Edificio A' }]);
      const result = await service.getUserBuildings('u-1');
      expect(result).toEqual([{ id: 'b-1', name: 'Edificio A' }]);
    });
  });
});
