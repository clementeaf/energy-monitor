import { AuthService, type TokenPayload } from '../src/auth/auth.service';
import type { RolesService } from '../src/roles/roles.service';
import type { Role } from '../src/roles/role.entity';
import type { User } from '../src/users/user.entity';
import type { UsersService } from '../src/users/users.service';

describe('AuthService', () => {
  const usersService = {
    bindIdentityFromLogin: jest.fn(),
    findByExternalId: jest.fn(),
    getSiteIds: jest.fn(),
  } as unknown as jest.Mocked<Pick<UsersService, 'bindIdentityFromLogin' | 'findByExternalId' | 'getSiteIds'>>;

  const rolesService = {
    getPermissionsByRoleId: jest.fn(),
  } as unknown as jest.Mocked<Pick<RolesService, 'getPermissionsByRoleId'>>;

  const service = new AuthService(
    usersService as unknown as UsersService,
    rolesService as unknown as RolesService,
  );

  const payload: TokenPayload = {
    sub: 'google-sub-1',
    email: 'operator@example.com',
    name: 'Operador',
    iss: 'https://accounts.google.com',
  };

  beforeEach(() => {
    usersService.bindIdentityFromLogin.mockReset();
    usersService.findByExternalId.mockReset();
    usersService.getSiteIds.mockReset();
    rolesService.getPermissionsByRoleId.mockReset();
  });

  it('returns null when login email has no invitation or bound user', async () => {
    usersService.bindIdentityFromLogin.mockResolvedValue(null);

    await expect(service.resolveUser(payload)).resolves.toBeNull();
    expect(usersService.findByExternalId).not.toHaveBeenCalled();
  });

  it('returns user and permissions when invited access record is bound on first login', async () => {
    usersService.bindIdentityFromLogin.mockResolvedValue({
      id: 'user-1',
      externalId: 'google-sub-1',
      provider: 'google',
      email: 'operator@example.com',
      name: 'Operador',
      avatarUrl: null,
      roleId: 4,
      isActive: true,
      createdAt: new Date('2026-03-10T10:00:00.000Z'),
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
      role: {
        id: 4,
        name: 'OPERATOR',
        labelEs: 'Operador',
        isActive: true,
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
      } as Role,
    } as User);
    usersService.findByExternalId.mockResolvedValue({
      id: 'user-1',
      roleId: 4,
      role: {
        id: 4,
        name: 'OPERATOR',
        labelEs: 'Operador',
        isActive: true,
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
      } as Role,
      provider: 'google',
      externalId: 'google-sub-1',
      email: 'operator@example.com',
      name: 'Operador',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-03-10T10:00:00.000Z'),
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    } as User);
    rolesService.getPermissionsByRoleId.mockResolvedValue({
      BUILDINGS_OVERVIEW: ['view'],
      METER_DETAIL: ['view'],
    });
    usersService.getSiteIds.mockResolvedValue(['pac4220']);

    await expect(service.resolveUser(payload)).resolves.toEqual({
      user: {
        id: 'user-1',
        email: 'operator@example.com',
        name: 'Operador',
        role: 'OPERATOR',
        provider: 'google',
        avatar: undefined,
        siteIds: ['pac4220'],
      },
      permissions: {
        BUILDINGS_OVERVIEW: ['view'],
        METER_DETAIL: ['view'],
      },
    });
  });
});