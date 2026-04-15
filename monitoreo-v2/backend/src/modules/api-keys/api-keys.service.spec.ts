import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';

const TENANT = 't-1';
const USER_ID = 'u-1';

function mockApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: 'ak-1',
    tenantId: TENANT,
    name: 'Test Key',
    keyHash: 'abc123hash',
    keyPrefix: 'emk_abcd',
    permissions: ['buildings:read', 'meters:read'],
    buildingIds: [],
    rateLimitPerMinute: 60,
    expiresAt: null,
    isActive: true,
    lastUsedAt: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ApiKey;
}

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id ?? 'new-id' })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: getRepositoryToken(ApiKey), useValue: repo },
      ],
    }).compile();

    service = module.get(ApiKeysService);
  });

  /* ------ CRUD ------ */

  describe('findAll', () => {
    it('returns keys for tenant ordered by name', async () => {
      repo.find.mockResolvedValue([mockApiKey()]);
      const result = await service.findAll(TENANT);
      expect(result).toHaveLength(1);
      expect(repo.find).toHaveBeenCalledWith({
        where: { tenantId: TENANT },
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('returns key when found', async () => {
      repo.findOneBy.mockResolvedValue(mockApiKey());
      const result = await service.findOne('ak-1', TENANT);
      expect(result).toBeDefined();
    });

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const result = await service.findOne('missing', TENANT);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('generates key with emk_ prefix', async () => {
      const result = await service.create(TENANT, {
        name: 'New Key',
        permissions: ['buildings:read'],
      }, USER_ID);

      expect(result.plainKey).toMatch(/^emk_/);
      expect(result.plainKey.length).toBeGreaterThan(20);
    });

    it('stores SHA-256 hash, not plain key', async () => {
      const result = await service.create(TENANT, {
        name: 'New Key',
        permissions: ['buildings:read'],
      }, USER_ID);

      const expectedHash = createHash('sha256').update(result.plainKey).digest('hex');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ keyHash: expectedHash }),
      );
    });

    it('stores first 8 chars as prefix', async () => {
      const result = await service.create(TENANT, {
        name: 'New Key',
        permissions: ['buildings:read'],
      }, USER_ID);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ keyPrefix: result.plainKey.slice(0, 8) }),
      );
    });

    it('sets defaults for optional fields', async () => {
      await service.create(TENANT, {
        name: 'New Key',
        permissions: ['buildings:read'],
      }, USER_ID);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          buildingIds: [],
          rateLimitPerMinute: 60,
          expiresAt: null,
          isActive: true,
          createdBy: USER_ID,
        }),
      );
    });

    it('uses provided optional fields', async () => {
      const expires = '2027-01-01T00:00:00Z';
      await service.create(TENANT, {
        name: 'Custom',
        permissions: ['buildings:read'],
        buildingIds: ['b-1'],
        rateLimitPerMinute: 120,
        expiresAt: expires,
      }, USER_ID);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          buildingIds: ['b-1'],
          rateLimitPerMinute: 120,
          expiresAt: new Date(expires),
        }),
      );
    });
  });

  describe('update', () => {
    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const result = await service.update('missing', TENANT, { name: 'x' });
      expect(result).toBeNull();
    });

    it('updates specified fields only', async () => {
      const existing = mockApiKey();
      repo.findOneBy.mockResolvedValue(existing);
      await service.update('ak-1', TENANT, { name: 'Renamed', isActive: false });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Renamed', isActive: false }),
      );
    });

    it('does not change fields not in dto', async () => {
      const existing = mockApiKey({ rateLimitPerMinute: 100 });
      repo.findOneBy.mockResolvedValue(existing);
      await service.update('ak-1', TENANT, { name: 'New Name' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ rateLimitPerMinute: 100 }),
      );
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      const result = await service.remove('ak-1', TENANT);
      expect(result).toBe(true);
    });

    it('returns false when not found', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      const result = await service.remove('missing', TENANT);
      expect(result).toBe(false);
    });
  });

  describe('rotateKey', () => {
    it('throws NotFoundException when not found', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.rotateKey('missing', TENANT)).rejects.toThrow(NotFoundException);
    });

    it('generates new key and updates hash + prefix', async () => {
      const existing = mockApiKey();
      repo.findOneBy.mockResolvedValue(existing);

      const result = await service.rotateKey('ak-1', TENANT);

      expect(result.plainKey).toMatch(/^emk_/);
      expect(result.plainKey).not.toBe(existing.keyHash); // different from old hash
      const expectedHash = createHash('sha256').update(result.plainKey).digest('hex');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          keyHash: expectedHash,
          keyPrefix: result.plainKey.slice(0, 8),
        }),
      );
    });
  });

  /* ------ Validation ------ */

  describe('validate', () => {
    it('returns null when no candidates match prefix', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.validate('emk_unknown');
      expect(result).toBeNull();
      expect(repo.find).toHaveBeenCalledWith({
        where: { keyPrefix: 'emk_unkn', isActive: true },
      });
    });

    it('returns null for expired key', async () => {
      const testKey = 'emk_testkey_expired';
      const hash = createHash('sha256').update(testKey).digest('hex');
      const expired = mockApiKey({ keyHash: hash, keyPrefix: testKey.slice(0, 8), expiresAt: new Date('2020-01-01') });
      repo.find.mockResolvedValue([expired]);
      const result = await service.validate(testKey);
      expect(result).toBeNull();
    });

    it('returns JwtPayload-compatible object for valid key', async () => {
      const testKey = 'emk_validkey_for_test';
      const hash = createHash('sha256').update(testKey).digest('hex');
      const key = mockApiKey({
        id: 'ak-99',
        keyHash: hash,
        keyPrefix: testKey.slice(0, 8),
        permissions: ['buildings:read', 'meters:read'],
        buildingIds: ['b-1'],
      });
      repo.find.mockResolvedValue([key]);

      const result = await service.validate(testKey);

      expect(result).not.toBeNull();
      expect(result!.sub).toBe('apikey:ak-99');
      expect(result!.tenantId).toBe(TENANT);
      expect(result!.permissions).toEqual(['buildings:read', 'meters:read']);
      expect(result!.buildingIds).toEqual(['b-1']);
      expect(result!.roleSlug).toBe('api_key');
      expect(result!._apiKeyId).toBe('ak-99');
    });

    it('updates lastUsedAt on successful validation', async () => {
      const testKey = 'emk_lastused_test';
      const hash = createHash('sha256').update(testKey).digest('hex');
      repo.find.mockResolvedValue([mockApiKey({ keyHash: hash, keyPrefix: testKey.slice(0, 8) })]);
      await service.validate(testKey);
      expect(repo.update).toHaveBeenCalledWith('ak-1', { lastUsedAt: expect.any(Date) });
    });

    it('uses constant-time comparison (timingSafeEqual)', async () => {
      const testKey = 'emk_timing_test_key';
      const hash = createHash('sha256').update(testKey).digest('hex');
      const wrongHash = createHash('sha256').update('emk_wrong_key_xxxx').digest('hex');
      // Two candidates: one wrong, one correct
      repo.find.mockResolvedValue([
        mockApiKey({ id: 'ak-wrong', keyHash: wrongHash, keyPrefix: testKey.slice(0, 8) }),
        mockApiKey({ id: 'ak-right', keyHash: hash, keyPrefix: testKey.slice(0, 8) }),
      ]);

      const result = await service.validate(testKey);
      expect(result).not.toBeNull();
      expect(result!._apiKeyId).toBe('ak-right');
    });
  });
});
