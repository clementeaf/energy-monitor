import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RolesService } from '../roles/roles.service';

describe('AuthService', () => {
  let service: AuthService;
  let ds: { query: jest.Mock; createQueryRunner: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let rolesService: Record<string, jest.Mock>;

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

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: DataSource, useValue: ds },
        { provide: RolesService, useValue: rolesService },
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
        .mockResolvedValueOnce(undefined); // INSERT refresh_token

      const result = await service.validateOAuthLogin(profile);

      expect(result.accessToken).toBe('jwt-token');
      expect(result.refreshToken).toBeDefined();
    });

    it('falls back to email match and links provider', async () => {
      ds.query
        .mockResolvedValueOnce([]) // no provider match
        .mockResolvedValueOnce([{ id: 'u-1', tenant_id: 't-1', email: 'a@b.com', role_id: 'r-1', is_active: true, role_slug: 'operator' }]) // email match
        .mockResolvedValueOnce(undefined) // UPDATE link provider
        .mockResolvedValueOnce(undefined) // UPDATE last_login
        .mockResolvedValueOnce(undefined); // INSERT refresh_token

      const result = await service.validateOAuthLogin(profile);
      expect(result.accessToken).toBe('jwt-token');
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

  describe('getUserBuildings', () => {
    it('returns building refs', async () => {
      ds.query.mockResolvedValue([{ id: 'b-1', name: 'Edificio A' }]);
      const result = await service.getUserBuildings('u-1');
      expect(result).toEqual([{ id: 'b-1', name: 'Edificio A' }]);
    });
  });
});
