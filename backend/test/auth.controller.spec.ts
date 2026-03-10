import { ForbiddenException } from '@nestjs/common';
import { AuthController } from '../src/auth/auth.controller';
import type { AuthService, TokenPayload } from '../src/auth/auth.service';

describe('AuthController', () => {
  const payload: TokenPayload = {
    sub: 'user-1',
    email: 'user@example.com',
    name: 'User',
    iss: 'https://accounts.google.com',
  };

  const authService = {
    resolveUser: jest.fn(),
    resolvePermissions: jest.fn(),
  } as unknown as jest.Mocked<Pick<AuthService, 'resolveUser' | 'resolvePermissions'>>;

  const controller = new AuthController(authService as unknown as AuthService);

  beforeEach(() => {
    authService.resolveUser.mockReset();
    authService.resolvePermissions.mockReset();
  });

  it('returns authenticated user data from getMe', async () => {
    const result: NonNullable<Awaited<ReturnType<AuthService['resolveUser']>>> = {
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'OPERATOR',
        provider: 'google',
        avatar: undefined,
        siteIds: ['pac4220'],
      },
      permissions: { BUILDINGS: ['view'] },
    };

    authService.resolveUser.mockResolvedValue(result);

    await expect(controller.getMe(payload)).resolves.toEqual(result);
  });

  it('throws ForbiddenException when getMe resolves null', async () => {
    authService.resolveUser.mockResolvedValue(null);

    await expect(controller.getMe(payload)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns permissions from getPermissions', async () => {
    const result: NonNullable<Awaited<ReturnType<AuthService['resolvePermissions']>>> = {
      role: 'OPERATOR',
      permissions: { ALERTS: ['view'] },
    };
    authService.resolvePermissions.mockResolvedValue(result);

    await expect(controller.getPermissions(payload)).resolves.toEqual(result);
  });
});