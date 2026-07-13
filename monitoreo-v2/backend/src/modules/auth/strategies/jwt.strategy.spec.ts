import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JwtBlacklistService } from '../jwt-blacklist.service';

// Mock blacklist that never blocks
const mockBlacklist: Pick<JwtBlacklistService, 'isBlacklisted' | 'isUserBlacklisted'> = {
  isBlacklisted: async () => false,
  isUserBlacklisted: async () => false,
};

// Create instance bypassing Passport constructor
function createStrategy(blacklist = mockBlacklist): JwtStrategy {
  const strategy = Object.create(JwtStrategy.prototype);
  (strategy as Record<string, unknown>).blacklist = blacklist;
  return strategy;
}

describe('JwtStrategy.validate', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = createStrategy();
  });

  const validPayload = {
    sub: 'u-1',
    email: 'test@test.com',
    tenantId: 't-1',
    roleId: 'r-1',
    roleSlug: 'corp_admin',
    permissions: ['buildings:read'],
    buildingIds: ['b-1'],
    iat: Math.floor(Date.now() / 1000),
  };

  it('accepts valid payload', async () => {
    const result = await strategy.validate(validPayload);
    expect(result.sub).toBe('u-1');
    expect(result.permissions).toEqual(['buildings:read']);
    expect(result.buildingIds).toEqual(['b-1']);
  });

  it('defaults buildingIds to empty array when undefined', async () => {
    const { buildingIds, ...rest } = validPayload;
    const result = await strategy.validate(rest);
    expect(result.buildingIds).toEqual([]);
  });

  it('rejects payload missing sub', async () => {
    const { sub, ...rest } = validPayload;
    await expect(strategy.validate(rest)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects payload with non-string email', async () => {
    await expect(strategy.validate({ ...validPayload, email: 123 })).rejects.toThrow(UnauthorizedException);
  });

  it('rejects payload with non-string tenantId', async () => {
    await expect(strategy.validate({ ...validPayload, tenantId: null })).rejects.toThrow(UnauthorizedException);
  });

  it('rejects payload with non-array permissions', async () => {
    await expect(strategy.validate({ ...validPayload, permissions: 'admin' })).rejects.toThrow(UnauthorizedException);
  });

  it('rejects payload with non-string items in permissions', async () => {
    await expect(strategy.validate({ ...validPayload, permissions: [1, 2] })).rejects.toThrow(UnauthorizedException);
  });

  it('rejects payload with non-array buildingIds', async () => {
    await expect(strategy.validate({ ...validPayload, buildingIds: 'b-1' })).rejects.toThrow(UnauthorizedException);
  });

  it('rejects payload with non-string items in buildingIds', async () => {
    await expect(strategy.validate({ ...validPayload, buildingIds: [1] })).rejects.toThrow(UnauthorizedException);
  });

  it('rejects completely empty object', async () => {
    await expect(strategy.validate({})).rejects.toThrow(UnauthorizedException);
  });

  it('rejects crafted super_admin escalation with wrong types', async () => {
    await expect(
      strategy.validate({
        sub: 123,
        email: true,
        tenantId: [],
        roleSlug: 'super_admin',
        roleId: null,
        permissions: '*',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects blacklisted user', async () => {
    const blockedBlacklist = { ...mockBlacklist, isUserBlacklisted: async () => true };
    const blockedStrategy = createStrategy(blockedBlacklist);
    await expect(blockedStrategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
  });
});
