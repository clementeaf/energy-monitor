import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantSsoService } from './tenant-sso.service';
import { TenantsService } from '../../tenants/tenants.service';
import { TenantSsoConfig } from '../entities/tenant-sso-config.entity';
import { OIDC_CLIENT } from './oidc-client.interface';
import type { OidcClient } from './oidc-client.interface';

describe('TenantSsoService', () => {
  let service: TenantSsoService;
  let repo: Record<string, jest.Mock>;
  let tenantsService: Record<string, jest.Mock>;
  let oidcClient: OidcClient;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOneBy: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve(v)),
    };
    tenantsService = {
      findBySlug: jest.fn(),
      findById: jest.fn(),
    };
    oidcClient = {
      buildAuthorizeUrl: jest.fn().mockReturnValue('https://idp.example/authorize'),
      exchangeCode: jest.fn().mockResolvedValue({ idToken: 'id-tok', accessToken: 'acc' }),
      verifyIdToken: jest.fn().mockResolvedValue({
        sub: 'sub-1',
        email: 'user@corp.com',
        displayName: 'Corp User',
      }),
    };
    dataSource = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TenantSsoService,
        { provide: getRepositoryToken(TenantSsoConfig), useValue: repo },
        { provide: TenantsService, useValue: tenantsService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('state-jwt'), verify: jest.fn().mockReturnValue({ tenantId: 't-1' }) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:4000/api') } },
        { provide: OIDC_CLIENT, useValue: oidcClient },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(TenantSsoService);
  });

  it('getPublicConfig returns ssoRequired when configured', async () => {
    tenantsService.findBySlug.mockResolvedValue({
      id: 't-1',
      slug: 'pasa',
      settings: { ssoProvider: 'azure_ad' },
    });
    repo.findOneBy.mockResolvedValue({ tenantId: 't-1' });

    const config = await service.getPublicConfig('pasa');
    expect(config.ssoRequired).toBe(true);
    expect(config.provider).toBe('azure_ad');
  });

  it('startLogin throws when SSO disabled', async () => {
    tenantsService.findBySlug.mockResolvedValue({
      id: 't-1',
      slug: 'pasa',
      settings: {},
    });
    await expect(service.startLogin('pasa')).rejects.toThrow(BadRequestException);
  });

  it('startLogin returns redirect URL', async () => {
    tenantsService.findBySlug.mockResolvedValue({
      id: 't-1',
      slug: 'pasa',
      settings: { ssoProvider: 'oidc' },
    });
    repo.findOneBy.mockResolvedValue({
      tenantId: 't-1',
      issuer: 'https://idp.example',
      clientId: 'client-1',
      encryptedClientSecret: 'secret',
    });

    const result = await service.startLogin('pasa');
    expect(result.redirectUrl).toContain('https://idp.example/authorize');
  });

  it('deprovisionUser deactivates by externalId', async () => {
    repo.findOneBy.mockResolvedValue({ scimWebhookSecret: 'wh-secret' });
    dataSource.query.mockResolvedValue([{ id: 'u-1' }]);

    const result = await service.deprovisionUser('t-1', 'wh-secret', { externalId: 'sub-1' });
    expect(result.deactivated).toBe(true);
    expect(result.userId).toBe('u-1');
  });
});
