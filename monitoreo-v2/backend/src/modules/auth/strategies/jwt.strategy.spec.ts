import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

// Create instance bypassing Passport constructor
function createStrategy(): JwtStrategy {
  const strategy = Object.create(JwtStrategy.prototype);
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
  };

  it('accepts valid payload', () => {
    const result = strategy.validate(validPayload);
    expect(result.sub).toBe('u-1');
    expect(result.permissions).toEqual(['buildings:read']);
    expect(result.buildingIds).toEqual(['b-1']);
  });

  it('defaults buildingIds to empty array when undefined', () => {
    const { buildingIds, ...rest } = validPayload;
    const result = strategy.validate(rest);
    expect(result.buildingIds).toEqual([]);
  });

  it('rejects payload missing sub', () => {
    const { sub, ...rest } = validPayload;
    expect(() => strategy.validate(rest)).toThrow(UnauthorizedException);
  });

  it('rejects payload with non-string email', () => {
    expect(() => strategy.validate({ ...validPayload, email: 123 })).toThrow(UnauthorizedException);
  });

  it('rejects payload with non-string tenantId', () => {
    expect(() => strategy.validate({ ...validPayload, tenantId: null })).toThrow(UnauthorizedException);
  });

  it('rejects payload with non-array permissions', () => {
    expect(() => strategy.validate({ ...validPayload, permissions: 'admin' })).toThrow(UnauthorizedException);
  });

  it('rejects payload with non-string items in permissions', () => {
    expect(() => strategy.validate({ ...validPayload, permissions: [1, 2] })).toThrow(UnauthorizedException);
  });

  it('rejects payload with non-array buildingIds', () => {
    expect(() => strategy.validate({ ...validPayload, buildingIds: 'b-1' })).toThrow(UnauthorizedException);
  });

  it('rejects payload with non-string items in buildingIds', () => {
    expect(() => strategy.validate({ ...validPayload, buildingIds: [1] })).toThrow(UnauthorizedException);
  });

  it('rejects completely empty object', () => {
    expect(() => strategy.validate({})).toThrow(UnauthorizedException);
  });

  it('rejects crafted super_admin escalation with wrong types', () => {
    expect(() =>
      strategy.validate({
        sub: 123,
        email: true,
        tenantId: [],
        roleSlug: 'super_admin',
        roleId: null,
        permissions: '*',
      }),
    ).toThrow(UnauthorizedException);
  });
});
