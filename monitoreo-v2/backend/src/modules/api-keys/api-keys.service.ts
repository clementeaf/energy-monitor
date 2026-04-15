import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

export interface ApiKeyCreationResult {
  /** The full plain-text key — shown ONCE at creation. */
  plainKey: string;
  /** The persisted entity (without the plain key). */
  apiKey: ApiKey;
}

export interface ValidatedApiKeyPayload extends JwtPayload {
  /** Marks this payload as originating from an API key (not OAuth JWT). */
  _apiKeyId: string;
  /** Rate limit for this key (requests per minute). */
  _rateLimitPerMinute: number;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  CRUD                                                               */
  /* ------------------------------------------------------------------ */

  async findAll(tenantId: string): Promise<ApiKey[]> {
    return this.repo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<ApiKey | null> {
    return this.repo.findOneBy({ id, tenantId });
  }

  async create(tenantId: string, dto: CreateApiKeyDto, createdBy: string): Promise<ApiKeyCreationResult> {
    const plainKey = this.generateKey();
    const keyHash = this.hashKey(plainKey);
    const keyPrefix = plainKey.slice(0, 8);

    const entity = this.repo.create({
      tenantId,
      name: dto.name,
      keyHash,
      keyPrefix,
      permissions: dto.permissions,
      buildingIds: dto.buildingIds ?? [],
      rateLimitPerMinute: dto.rateLimitPerMinute ?? 60,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: true,
      lastUsedAt: null,
      createdBy,
    });

    const apiKey = await this.repo.save(entity);
    return { plainKey, apiKey };
  }

  async update(id: string, tenantId: string, dto: UpdateApiKeyDto): Promise<ApiKey | null> {
    const row = await this.repo.findOneBy({ id, tenantId });
    if (!row) return null;

    if (dto.name !== undefined) row.name = dto.name;
    if (dto.permissions !== undefined) row.permissions = dto.permissions;
    if (dto.buildingIds !== undefined) row.buildingIds = dto.buildingIds;
    if (dto.rateLimitPerMinute !== undefined) row.rateLimitPerMinute = dto.rateLimitPerMinute;
    if (dto.expiresAt !== undefined) row.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;

    return this.repo.save(row);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /** Regenerate key for an existing API key. Returns new plain key ONCE. */
  async rotateKey(id: string, tenantId: string): Promise<ApiKeyCreationResult> {
    const row = await this.repo.findOneBy({ id, tenantId });
    if (!row) throw new NotFoundException('API key not found');

    const plainKey = this.generateKey();
    row.keyHash = this.hashKey(plainKey);
    row.keyPrefix = plainKey.slice(0, 8);

    const apiKey = await this.repo.save(row);
    return { plainKey, apiKey };
  }

  /* ------------------------------------------------------------------ */
  /*  Validation (used by ApiKeyGuard)                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Validate an API key and return a JwtPayload-compatible object.
   * Returns null if key is invalid, inactive, or expired.
   */
  async validate(rawKey: string): Promise<ValidatedApiKeyPayload | null> {
    const keyHash = this.hashKey(rawKey);
    const keyHashBuf = Buffer.from(keyHash, 'hex');

    // Fetch all active keys and compare with constant-time to prevent timing attacks.
    // The key_prefix index narrows the scan; timingSafeEqual prevents hash enumeration.
    const prefix = rawKey.slice(0, 8);
    const candidates = await this.repo.find({
      where: { keyPrefix: prefix, isActive: true },
    });

    let matched: ApiKey | null = null;
    for (const candidate of candidates) {
      const candidateBuf = Buffer.from(candidate.keyHash, 'hex');
      if (candidateBuf.length === keyHashBuf.length && timingSafeEqual(keyHashBuf, candidateBuf)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) return null;

    // Check expiration
    if (matched.expiresAt && matched.expiresAt < new Date()) {
      return null;
    }

    // Update last used (fire-and-forget, don't block the request)
    this.repo.update(matched.id, { lastUsedAt: new Date() }).catch(() => {});

    return {
      sub: `apikey:${matched.id}`,
      email: `apikey-${matched.keyPrefix}@system`,
      tenantId: matched.tenantId,
      roleId: 'api_key',
      roleSlug: 'api_key',
      permissions: matched.permissions,
      buildingIds: matched.buildingIds,
      _apiKeyId: matched.id,
      _rateLimitPerMinute: matched.rateLimitPerMinute,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  private generateKey(): string {
    return `emk_${randomBytes(36).toString('base64url')}`;
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
