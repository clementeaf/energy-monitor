import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository, DataSource } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { encryptString, decryptString } from '../../../common/crypto/config-encryption';
import { getSsoProvider } from '../../../lib/tenant-settings';
import { TenantsService } from '../../tenants/tenants.service';
import { TenantSsoConfig } from '../entities/tenant-sso-config.entity';
import { UpsertTenantSsoConfigDto } from '../dto/upsert-tenant-sso-config.dto';
import type { OidcClient } from './oidc-client.interface';
import { OIDC_CLIENT } from './oidc-client.interface';

export interface SsoPublicConfig {
  ssoRequired: boolean;
  provider: string | null;
  tenantSlug: string;
}

export interface SsoStartResult {
  redirectUrl: string;
}

export interface SsoCallbackProfile {
  provider: 'oidc';
  providerId: string;
  email: string;
  displayName: string;
  tenantId: string;
}

interface SsoStatePayload {
  tenantId: string;
  nonce: string;
}

@Injectable()
export class TenantSsoService {
  constructor(
    @InjectRepository(TenantSsoConfig)
    private readonly repo: Repository<TenantSsoConfig>,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(OIDC_CLIENT) private readonly oidcClient: OidcClient,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Returns public SSO config for login page (no secrets).
   */
  async getPublicConfig(tenantSlug: string): Promise<SsoPublicConfig> {
    const tenant = await this.tenantsService.findBySlug(tenantSlug);
    const provider = getSsoProvider(tenant.settings);
    const config = provider ? await this.repo.findOneBy({ tenantId: tenant.id }) : null;
    return {
      ssoRequired: provider != null && config != null,
      provider,
      tenantSlug: tenant.slug,
    };
  }

  /**
   * Builds OIDC authorize redirect URL for tenant SSO login.
   */
  async startLogin(tenantSlug: string): Promise<SsoStartResult> {
    const tenant = await this.tenantsService.findBySlug(tenantSlug);
    const provider = getSsoProvider(tenant.settings);
    if (!provider) {
      throw new BadRequestException('SSO is not enabled for this tenant');
    }
    const ssoConfig = await this.repo.findOneBy({ tenantId: tenant.id });
    if (!ssoConfig) {
      throw new BadRequestException('SSO configuration is incomplete');
    }
    const state = this.jwtService.sign(
      { tenantId: tenant.id, nonce: createHmac('sha256', tenant.id).update(Date.now().toString()).digest('hex').slice(0, 16) },
      { expiresIn: '10m' },
    );
    const redirectUri = this.getCallbackUrl();
    const redirectUrl = this.oidcClient.buildAuthorizeUrl({
      issuer: ssoConfig.issuer,
      clientId: ssoConfig.clientId,
      redirectUri,
      state,
    });
    return { redirectUrl };
  }

  /**
   * Handles OIDC callback, verifies tokens and returns user profile for auth.
   */
  async handleCallback(code: string, state: string): Promise<SsoCallbackProfile> {
    let statePayload: SsoStatePayload;
    try {
      statePayload = this.jwtService.verify(state) as SsoStatePayload;
    } catch {
      throw new UnauthorizedException('Invalid SSO state');
    }
    const tenant = await this.tenantsService.findById(statePayload.tenantId);
    const provider = getSsoProvider(tenant.settings);
    if (!provider) {
      throw new BadRequestException('SSO is not enabled for this tenant');
    }
    const ssoConfig = await this.repo.findOneBy({ tenantId: tenant.id });
    if (!ssoConfig) {
      throw new BadRequestException('SSO configuration is incomplete');
    }
    const clientSecret = decryptString(ssoConfig.encryptedClientSecret);
    const redirectUri = this.getCallbackUrl();
    const tokens = await this.oidcClient.exchangeCode({
      issuer: ssoConfig.issuer,
      clientId: ssoConfig.clientId,
      clientSecret,
      redirectUri,
      code,
    });
    const profile = await this.oidcClient.verifyIdToken({
      idToken: tokens.idToken,
      issuer: ssoConfig.issuer,
      clientId: ssoConfig.clientId,
      metadataUrl: ssoConfig.metadataUrl,
    });
    return {
      provider: 'oidc',
      providerId: profile.sub,
      email: profile.email,
      displayName: profile.displayName,
      tenantId: tenant.id,
    };
  }

  /**
   * Returns SSO config for admin (secrets redacted).
   */
  async getConfigForAdmin(tenantId: string): Promise<Record<string, unknown> | null> {
    const row = await this.repo.findOneBy({ tenantId });
    if (!row) return null;
    return {
      tenantId: row.tenantId,
      issuer: row.issuer,
      clientId: row.clientId,
      metadataUrl: row.metadataUrl,
      hasClientSecret: row.encryptedClientSecret.length > 0,
      hasScimWebhookSecret: row.scimWebhookSecret != null && row.scimWebhookSecret.length > 0,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Creates or updates tenant SSO configuration.
   */
  async upsertConfig(tenantId: string, dto: UpsertTenantSsoConfigDto): Promise<TenantSsoConfig> {
    await this.tenantsService.findById(tenantId);
    const encryptedSecret = encryptString(dto.clientSecret);
    let row = await this.repo.findOneBy({ tenantId });
    if (!row) {
      row = this.repo.create({
        tenantId,
        issuer: dto.issuer,
        clientId: dto.clientId,
        metadataUrl: dto.metadataUrl ?? null,
        encryptedClientSecret: encryptedSecret,
        scimWebhookSecret: dto.scimWebhookSecret ?? null,
      });
    } else {
      row.issuer = dto.issuer;
      row.clientId = dto.clientId;
      row.metadataUrl = dto.metadataUrl ?? null;
      row.encryptedClientSecret = encryptedSecret;
      if (dto.scimWebhookSecret !== undefined) {
        row.scimWebhookSecret = dto.scimWebhookSecret;
      }
    }
    return this.repo.save(row);
  }

  /**
   * Deactivates user on IdP delete (SCIM stub).
   */
  async deprovisionUser(
    tenantId: string,
    webhookSecret: string,
    params: { email?: string; externalId?: string },
  ): Promise<{ deactivated: boolean; userId?: string }> {
    const config = await this.repo.findOneBy({ tenantId });
    if (!config?.scimWebhookSecret) {
      throw new UnauthorizedException('SCIM webhook not configured');
    }
    if (!this.secretsMatch(webhookSecret, config.scimWebhookSecret)) {
      throw new UnauthorizedException('Invalid SCIM webhook secret');
    }
    if (!params.email && !params.externalId) {
      throw new BadRequestException('email or externalId is required');
    }
    let rows: Array<{ id: string }>;
    if (params.externalId) {
      rows = await this.dataSource.query(
        `UPDATE users SET is_active = false, updated_at = NOW()
         WHERE tenant_id = $1 AND auth_provider = 'oidc' AND auth_provider_id = $2 AND is_active = true
         RETURNING id`,
        [tenantId, params.externalId],
      );
    } else {
      rows = await this.dataSource.query(
        `UPDATE users SET is_active = false, updated_at = NOW()
         WHERE tenant_id = $1 AND email = $2 AND is_active = true
         RETURNING id`,
        [tenantId, params.email],
      );
    }
    if (rows.length === 0) {
      throw new NotFoundException('User not found or already deactivated');
    }
    return { deactivated: true, userId: rows[0].id };
  }

  private getCallbackUrl(): string {
    const apiBase = this.configService.get<string>('API_PUBLIC_URL') ?? 'http://localhost:4000/api';
    return `${apiBase.replace(/\/$/, '')}/auth/sso/callback`;
  }

  private secretsMatch(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
