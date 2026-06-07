import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { OAuthClient } from './entities/oauth-client.entity';
import { CreateOAuthClientDto } from './dto/create-oauth-client.dto';
import { UpdateOAuthClientDto } from './dto/update-oauth-client.dto';
import {
  DEFAULT_OAUTH_TOKEN_TTL_SECONDS,
  MAX_OAUTH_TOKEN_TTL_SECONDS,
  MIN_OAUTH_TOKEN_TTL_SECONDS,
} from './lib/oauth-scopes';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

export interface OAuthClientCreationResult {
  clientId: string;
  clientSecret: string;
  client: OAuthClient;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

@Injectable()
export class OAuthClientsService {
  constructor(
    @InjectRepository(OAuthClient)
    private readonly repo: Repository<OAuthClient>,
    private readonly jwtService: JwtService,
  ) {}

  async findAll(tenantId: string): Promise<OAuthClient[]> {
    return this.repo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async findOne(id: string, tenantId: string): Promise<OAuthClient | null> {
    return this.repo.findOneBy({ id, tenantId });
  }

  async create(
    tenantId: string,
    dto: CreateOAuthClientDto,
    createdBy: string,
  ): Promise<OAuthClientCreationResult> {
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const entity = this.repo.create({
      tenantId,
      name: dto.name,
      clientId,
      secretHash: this.hashSecret(clientSecret),
      clientIdPrefix: clientId.slice(0, 12),
      scopes: dto.scopes,
      buildingIds: dto.buildingIds ?? [],
      tokenTtlSeconds: this.clampTtl(dto.tokenTtlSeconds ?? DEFAULT_OAUTH_TOKEN_TTL_SECONDS),
      isActive: true,
      lastUsedAt: null,
      createdBy,
    });
    const client = await this.repo.save(entity);
    return { clientId, clientSecret, client };
  }

  async update(id: string, tenantId: string, dto: UpdateOAuthClientDto): Promise<OAuthClient | null> {
    const row = await this.repo.findOneBy({ id, tenantId });
    if (!row) return null;
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.scopes !== undefined) row.scopes = dto.scopes;
    if (dto.buildingIds !== undefined) row.buildingIds = dto.buildingIds;
    if (dto.tokenTtlSeconds !== undefined) row.tokenTtlSeconds = this.clampTtl(dto.tokenTtlSeconds);
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    return this.repo.save(row);
  }

  async rotateSecret(id: string, tenantId: string): Promise<OAuthClientCreationResult> {
    const row = await this.repo.findOneBy({ id, tenantId });
    if (!row) throw new NotFoundException('OAuth client not found');
    const clientSecret = this.generateClientSecret();
    row.secretHash = this.hashSecret(clientSecret);
    const client = await this.repo.save(row);
    return { clientId: row.clientId, clientSecret, client };
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Validates client_credentials grant and returns a scoped Bearer JWT.
   */
  async issueToken(clientId: string, clientSecret: string): Promise<OAuthTokenResponse> {
    const client = await this.validateClientCredentials(clientId, clientSecret);
    if (!client) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    this.repo.update(client.id, { lastUsedAt: new Date() }).catch(() => {});

    const payload: JwtPayload = {
      sub: `oauth:${client.id}`,
      email: `oauth-${client.clientIdPrefix}@system`,
      tenantId: client.tenantId,
      roleId: 'oauth_client',
      roleSlug: 'oauth_client',
      permissions: client.scopes,
      buildingIds: client.buildingIds,
    };

    const expiresIn = client.tokenTtlSeconds;
    const accessToken = this.jwtService.sign(payload, { expiresIn: `${expiresIn}s` });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }

  /**
   * Constant-time credential validation; returns matched client or null.
   */
  async validateClientCredentials(clientId: string, clientSecret: string): Promise<OAuthClient | null> {
    const prefix = clientId.slice(0, 12);
    const candidates = await this.repo.find({
      where: { clientIdPrefix: prefix, isActive: true },
    });

    const secretHash = this.hashSecret(clientSecret);
    const secretBuf = Buffer.from(secretHash, 'hex');

    for (const candidate of candidates) {
      if (candidate.clientId !== clientId) continue;
      const candidateBuf = Buffer.from(candidate.secretHash, 'hex');
      if (candidateBuf.length === secretBuf.length && timingSafeEqual(secretBuf, candidateBuf)) {
        return candidate;
      }
    }
    return null;
  }

  private generateClientId(): string {
    return `emoc_${randomBytes(24).toString('base64url')}`;
  }

  private generateClientSecret(): string {
    return randomBytes(36).toString('base64url');
  }

  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private clampTtl(seconds: number): number {
    return Math.min(MAX_OAUTH_TOKEN_TTL_SECONDS, Math.max(MIN_OAUTH_TOKEN_TTL_SECONDS, seconds));
  }
}
