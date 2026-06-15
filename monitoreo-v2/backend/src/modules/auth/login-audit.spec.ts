import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { RolesService } from '../roles/roles.service';
import { TenantsService } from '../tenants/tenants.service';

describe('AuthService — writeLoginAudit (CYB-21)', () => {
  let service: AuthService;
  let ds: { query: jest.Mock; createQueryRunner: jest.Mock };

  beforeEach(async () => {
    ds = {
      query: jest.fn().mockResolvedValue(undefined),
      createQueryRunner: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: DataSource, useValue: ds },
        { provide: RolesService, useValue: {} },
        { provide: TenantsService, useValue: { findById: jest.fn().mockResolvedValue({ id: 't-1', settings: {} }) } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('writes LOGIN_SUCCESS audit with IP and user-agent', async () => {
    await service.writeLoginAudit({
      userId: 'u-1',
      tenantId: 't-1',
      action: 'LOGIN_SUCCESS',
      provider: 'google',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
    });

    expect(ds.query).toHaveBeenCalledTimes(1);
    const call = ds.query.mock.calls[0];
    expect(call[0]).toContain('INSERT INTO audit_logs');
    expect(call[0]).toContain('ip_address');
    expect(call[0]).toContain('user_agent');
    expect(call[1][0]).toBe('t-1'); // tenant_id
    expect(call[1][1]).toBe('u-1'); // user_id
    expect(call[1][2]).toBe('LOGIN_SUCCESS'); // action
    expect(call[1][3]).toBe('u-1'); // resource_id
    expect(call[1][5]).toBe('192.168.1.100'); // ip_address
    expect(call[1][6]).toBe('Mozilla/5.0'); // user_agent
  });

  it('writes LOGIN_FAILED audit', async () => {
    await service.writeLoginAudit({
      userId: 'u-1',
      tenantId: 't-1',
      action: 'LOGIN_FAILED',
      provider: 'mfa',
      ipAddress: '10.0.0.1',
      userAgent: null,
    });

    const call = ds.query.mock.calls[0];
    expect(call[1][2]).toBe('LOGIN_FAILED');
    expect(call[1][5]).toBe('10.0.0.1');
    expect(call[1][6]).toBeNull();
  });

  it('writes LOGIN_MFA_PENDING audit', async () => {
    await service.writeLoginAudit({
      userId: 'u-1',
      tenantId: '',
      action: 'LOGIN_MFA_PENDING',
      provider: 'microsoft',
      ipAddress: null,
      userAgent: null,
    });

    const call = ds.query.mock.calls[0];
    expect(call[1][2]).toBe('LOGIN_MFA_PENDING');
    const details = JSON.parse(call[1][4]);
    expect(details.provider).toBe('microsoft');
  });

  it('writes LOGIN_MFA_SUCCESS audit', async () => {
    await service.writeLoginAudit({
      userId: 'u-1',
      tenantId: 't-1',
      action: 'LOGIN_MFA_SUCCESS',
      provider: 'mfa',
      ipAddress: '172.16.0.5',
      userAgent: 'PostmanRuntime/7.32',
    });

    const call = ds.query.mock.calls[0];
    expect(call[1][2]).toBe('LOGIN_MFA_SUCCESS');
    expect(call[1][5]).toBe('172.16.0.5');
  });

  it('does not throw on audit write failure', async () => {
    ds.query.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(
      service.writeLoginAudit({
        userId: 'u-1',
        tenantId: 't-1',
        action: 'LOGIN_SUCCESS',
        provider: 'google',
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('stores resource_type as session', async () => {
    await service.writeLoginAudit({
      userId: 'u-1',
      tenantId: 't-1',
      action: 'LOGIN_SUCCESS',
      provider: 'google',
      ipAddress: null,
      userAgent: null,
    });

    const sql = ds.query.mock.calls[0][0];
    expect(sql).toContain("'session'");
  });
});
