import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { OAuthClientsService } from './oauth-clients.service';
import { OAuthClient } from './entities/oauth-client.entity';

describe('OAuthClientsService', () => {
  let service: OAuthClientsService;
  let repo: Record<string, jest.Mock>;
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ ...v, id: 'oc-1' })),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('oauth-jwt-token') };

    const module = await Test.createTestingModule({
      providers: [
        OAuthClientsService,
        { provide: getRepositoryToken(OAuthClient), useValue: repo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(OAuthClientsService);
  });

  it('issueToken returns Bearer JWT with expires_in', async () => {
    const secret = 'test-secret-value';
    const clientId = 'emoc_testclient123';
    const hash = (service as unknown as { hashSecret: (s: string) => string }).hashSecret(secret);

    repo.find.mockResolvedValue([
      {
        id: 'oc-1',
        clientId,
        clientIdPrefix: clientId.slice(0, 12),
        secretHash: hash,
        tenantId: 't-1',
        scopes: ['readings:export', 'buildings:read'],
        buildingIds: ['b-1'],
        tokenTtlSeconds: 3600,
        isActive: true,
      },
    ]);

    const result = await service.issueToken(clientId, secret);

    expect(result.access_token).toBe('oauth-jwt-token');
    expect(result.token_type).toBe('Bearer');
    expect(result.expires_in).toBe(3600);
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'oauth:oc-1',
        roleSlug: 'oauth_client',
        permissions: ['readings:export', 'buildings:read'],
        tenantId: 't-1',
      }),
      { expiresIn: '3600s' },
    );
  });

  it('issueToken throws for invalid credentials', async () => {
    repo.find.mockResolvedValue([]);
    await expect(service.issueToken('emoc_bad', 'wrong')).rejects.toThrow(UnauthorizedException);
  });

  it('create returns clientId and clientSecret once', async () => {
    const result = await service.create(
      't-1',
      { name: 'ETL Worker', scopes: ['readings:export'] },
      'u-1',
    );
    expect(result.clientId).toMatch(/^emoc_/);
    expect(result.clientSecret.length).toBeGreaterThan(20);
    expect(repo.save).toHaveBeenCalled();
  });
});
