import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';

const createMockContext = (user: any): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
  getHandler: () => jest.fn(),
  getClass: () => jest.fn(),
} as any);

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as any as Reflector);
  });

  it('allows access when route is @Public()', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(true) // IS_PUBLIC_KEY
      .mockReturnValueOnce(null);

    expect(guard.canActivate(createMockContext(null))).toBe(true);
  });

  it('allows access when no permissions required', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(null);

    expect(guard.canActivate(createMockContext({}))).toBe(true);
  });

  it('allows access when user has required permission', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['billing:read']);

    const user = { permissions: ['billing:read', 'alerts:read'] };
    expect(guard.canActivate(createMockContext(user))).toBe(true);
  });

  it('throws ForbiddenException when user lacks permission', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['admin_users:delete']);

    const user = { permissions: ['billing:read'] };
    expect(() => guard.canActivate(createMockContext(user))).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user has no permissions', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['billing:read']);

    const user = { permissions: [] };
    expect(() => guard.canActivate(createMockContext(user))).toThrow(ForbiddenException);
  });
});
