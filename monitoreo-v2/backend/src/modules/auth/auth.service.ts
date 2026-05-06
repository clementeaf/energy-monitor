import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RolesService } from '../roles/roles.service';
import { maskEmail, maskProviderId } from '../../common/logging/pii-redaction';

export interface OAuthProfile {
  provider: 'microsoft' | 'google';
  providerId: string;
  email: string;
  displayName: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Current privacy policy version — bump when policy text changes */
export const PRIVACY_POLICY_VERSION = '1.0';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly rolesService: RolesService,
  ) {}

  async getUserProfile(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT u.id, u.email, u.display_name, u.role_id, u.auth_provider, u.last_login_at,
              u.privacy_accepted_at, u.privacy_policy_version, u.mfa_enabled,
              u.data_processing_blocked,
              r.slug AS role_slug, r.name AS role_name, r.require_mfa
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.is_active = true`,
      [userId],
    );

    if (rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const row = rows[0];
    const permissions = await this.rolesService.getPermissionsByRoleId(row.role_id);
    const buildings = await this.getUserBuildings(userId);

    // Privacy: accepted if version matches current
    const privacyAccepted =
      row.privacy_accepted_at != null &&
      row.privacy_policy_version === PRIVACY_POLICY_VERSION;

    // MFA: role requires it but user hasn't set it up
    const requireMfaSetup = row.require_mfa && !row.mfa_enabled;

    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: {
        id: row.role_id,
        slug: row.role_slug,
        name: row.role_name,
      },
      permissions: permissions.map((p) => `${p.module}:${p.action}`),
      buildingIds: buildings.map((b) => b.id),
      buildings,
      authProvider: row.auth_provider,
      lastLoginAt: row.last_login_at,
      privacyAccepted,
      requireMfaSetup,
      dataProcessingBlocked: row.data_processing_blocked,
    };
  }

  async validateOAuthLogin(profile: OAuthProfile): Promise<
    TokenPair
    | { mfaRequired: true; userId: string }
    | { mfaSetupRequired: true; userId: string }
  > {
    // 1. Try exact match: provider + providerId
    let rows = await this.dataSource.query(
      `SELECT u.id, u.tenant_id, u.email, u.role_id, u.is_active,
              r.slug AS role_slug, r.require_mfa
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.auth_provider = $1 AND u.auth_provider_id = $2`,
      [profile.provider, profile.providerId],
    );

    // 2. Fallback: match by email (allows login with either provider)
    if (rows.length === 0) {
      rows = await this.dataSource.query(
        `SELECT u.id, u.tenant_id, u.email, u.role_id, u.is_active,
                r.slug AS role_slug, r.require_mfa
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.email = $1`,
        [profile.email],
      );

      if (rows.length > 0 && rows[0].is_active) {
        await this.dataSource.query(
          `UPDATE users SET auth_provider = $1, auth_provider_id = $2 WHERE id = $3`,
          [profile.provider, profile.providerId, rows[0].id],
        );
        this.logger.log(
          `Linked ${profile.provider} to existing user ${maskEmail(profile.email)}`,
        );
      }
    }

    if (rows.length === 0) {
      this.logger.warn(
        `OAuth login failed: user not found — provider=${profile.provider} providerId=${maskProviderId(profile.providerId)} email=${maskEmail(profile.email)}`,
      );
      throw new UnauthorizedException('Authentication failed.');
    }

    const user = rows[0];
    if (!user.is_active) {
      this.logger.warn(`OAuth login blocked: deactivated account ${maskEmail(user.email)}`);
      throw new UnauthorizedException('Authentication failed.');
    }

    // Update last login
    await this.dataSource.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [user.id],
    );

    // Check if MFA is enabled — if so, defer token issuance
    const mfaRows = await this.dataSource.query(
      `SELECT mfa_enabled FROM users WHERE id = $1`,
      [user.id],
    );
    if (mfaRows.length > 0 && mfaRows[0].mfa_enabled) {
      return { mfaRequired: true, userId: user.id };
    }

    // Check if role requires MFA but user hasn't set it up yet
    if (user.require_mfa && !mfaRows[0]?.mfa_enabled) {
      this.logger.log(`MFA setup required for role — user ${maskEmail(user.email)}`);
      return { mfaSetupRequired: true, userId: user.id };
    }

    // Load permissions from DB → flatten to "module:action" strings for JWT
    const permissions = await this.rolesService.getPermissionsByRoleId(user.role_id);
    const permissionStrings = permissions.map((p) => `${p.module}:${p.action}`);

    // Load building scoping + session duration
    const buildingIds = await this.rolesService.getUserBuildingIds(user.id);
    const role = await this.rolesService.getRoleByUserId(user.id);

    return this.generateTokenPair(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        roleId: user.role_id,
        roleSlug: user.role_slug,
        permissions: permissionStrings,
        buildingIds,
      },
      role?.maxSessionMinutes ?? 30,
    );
  }

  async generateTokenPair(payload: JwtPayload, sessionMinutes = 30): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${sessionMinutes}m`,
    });

    const refreshTokenRaw = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');

    await this.dataSource.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [payload.sub, tokenHash],
    );

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rows = await queryRunner.query(
        `SELECT rt.id, rt.user_id, u.email, u.tenant_id, u.role_id, u.is_active,
                r.slug AS role_slug
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         JOIN roles r ON r.id = u.role_id
         WHERE rt.token_hash = $1
           AND rt.revoked_at IS NULL
           AND rt.expires_at > NOW()
         FOR UPDATE OF rt`,
        [tokenHash],
      );

      if (rows.length === 0) {
        // Token theft detection: if this hash was previously revoked,
        // revoke ALL tokens for the user (attacker may have stolen the token)
        const reused = await queryRunner.query(
          `SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NOT NULL LIMIT 1`,
          [tokenHash],
        );
        if (reused.length > 0) {
          await queryRunner.query(
            `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'theft_detected'
             WHERE user_id = $1 AND revoked_at IS NULL`,
            [reused[0].user_id],
          );
          await queryRunner.commitTransaction();
          this.logger.warn(`Refresh token reuse detected for user ${maskEmail(reused[0].user_id)}. All sessions revoked.`);
        } else {
          await queryRunner.rollbackTransaction();
        }
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }

      const row = rows[0];
      if (!row.is_active) {
        await queryRunner.rollbackTransaction();
        throw new UnauthorizedException('Account is deactivated.');
      }

      // Rotate: revoke old token
      await queryRunner.query(
        `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'rotated' WHERE id = $1`,
        [row.id],
      );

      await queryRunner.commitTransaction();

      // Reload permissions + building scoping (may have changed since last login)
      const permissions = await this.rolesService.getPermissionsByRoleId(row.role_id);
      const permissionStrings = permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`);
      const buildingIds = await this.rolesService.getUserBuildingIds(row.user_id);
      const role = await this.rolesService.getRoleByUserId(row.user_id);

      return this.generateTokenPair(
        {
          sub: row.user_id,
          email: row.email,
          tenantId: row.tenant_id,
          roleId: row.role_id,
          roleSlug: row.role_slug,
          permissions: permissionStrings,
          buildingIds,
        },
        role?.maxSessionMinutes ?? 30,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserBuildings(userId: string): Promise<{ id: string; name: string }[]> {
    const rows = await this.dataSource.query(
      `SELECT b.id, b.name
       FROM user_building_access uba
       JOIN buildings b ON b.id = uba.building_id
       WHERE uba.user_id = $1
       ORDER BY b.name`,
      [userId],
    );
    return rows.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name }));
  }

  /**
   * Issue tokens for a user by ID (used after MFA validation).
   */
  async issueTokensForUser(userId: string): Promise<TokenPair> {
    const rows = await this.dataSource.query(
      `SELECT u.id, u.email, u.tenant_id, u.role_id, r.slug AS role_slug
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.is_active = true`,
      [userId],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException('User not found or inactive.');
    }
    const user = rows[0];
    const permissions = await this.rolesService.getPermissionsByRoleId(user.role_id);
    const permissionStrings = permissions.map((p) => `${p.module}:${p.action}`);
    const buildingIds = await this.rolesService.getUserBuildingIds(userId);
    const role = await this.rolesService.getRoleByUserId(userId);

    return this.generateTokenPair(
      {
        sub: userId,
        email: user.email,
        tenantId: user.tenant_id,
        roleId: user.role_id,
        roleSlug: user.role_slug,
        permissions: permissionStrings,
        buildingIds,
      },
      role?.maxSessionMinutes ?? 30,
    );
  }

  async updateProfile(userId: string, dto: { displayName?: string }): Promise<void> {
    if (dto.displayName !== undefined) {
      await this.dataSource.query(
        `UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2`,
        [dto.displayName, userId],
      );
    }
  }

  async revokeAllTokens(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'logout_all' WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  /* ── Ley 21.719: Privacy & Data Rights ── */

  async acceptPrivacyPolicy(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET privacy_accepted_at = NOW(), privacy_policy_version = $1 WHERE id = $2`,
      [PRIVACY_POLICY_VERSION, userId],
    );
    this.logger.log(`Privacy policy v${PRIVACY_POLICY_VERSION} accepted by user ${userId}`);
  }

  /**
   * Export all personal data for a user (ARCO+ access + portability).
   */
  async exportUserData(userId: string) {
    const userRows = await this.dataSource.query(
      `SELECT u.id, u.email, u.display_name, u.auth_provider, u.is_active,
              u.mfa_enabled, u.privacy_accepted_at, u.privacy_policy_version,
              u.last_login_at, u.created_at, u.updated_at,
              r.name AS role_name, r.slug AS role_slug,
              t.name AS tenant_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [userId],
    );

    if (userRows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const user = userRows[0];
    const buildings = await this.getUserBuildings(userId);

    const auditRows = await this.dataSource.query(
      `SELECT action, resource_type, resource_id, ip_address, created_at
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId],
    );

    const sessionRows = await this.dataSource.query(
      `SELECT created_at, expires_at, revoked_at, revoked_reason, ip_address, user_agent
       FROM refresh_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );

    return {
      exportedAt: new Date().toISOString(),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      personalData: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        authProvider: user.auth_provider,
        role: user.role_name,
        tenant: user.tenant_name,
        isActive: user.is_active,
        mfaEnabled: user.mfa_enabled,
        privacyAcceptedAt: user.privacy_accepted_at,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      buildingAccess: buildings,
      recentActivity: auditRows.map((r: Record<string, unknown>) => ({
        action: r.action,
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        ipAddress: r.ip_address,
        date: r.created_at,
      })),
      sessions: sessionRows.map((r: Record<string, unknown>) => ({
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        revokedAt: r.revoked_at,
        revokedReason: r.revoked_reason,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
      })),
    };
  }

  /**
   * Create account deletion request (ARCO+ cancellation right).
   * Admin must review and execute. PII anonymized on execution.
   */
  async createDeletionRequest(userId: string, tenantId: string, reason?: string) {
    // Check no pending request exists
    const existing = await this.dataSource.query(
      `SELECT id FROM deletion_requests WHERE user_id = $1 AND status = 'pending'`,
      [userId],
    );
    if (existing.length > 0) {
      return { alreadyRequested: true, requestId: existing[0].id };
    }

    // 15 business days ≈ 21 calendar days
    const rows = await this.dataSource.query(
      `INSERT INTO deletion_requests (user_id, tenant_id, reason, response_deadline)
       VALUES ($1, $2, $3, NOW() + INTERVAL '21 days')
       RETURNING id, requested_at, response_deadline`,
      [userId, tenantId, reason ?? null],
    );

    this.logger.log(`Deletion request created for user ${userId}`);
    return {
      requestId: rows[0].id,
      requestedAt: rows[0].requested_at,
      responseDeadline: rows[0].response_deadline,
    };
  }

  /* ── Opposition & Blocking (ARCO+) ── */

  async blockProcessing(userId: string, reason: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET data_processing_blocked = true, block_reason = $1, blocked_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [reason, userId],
    );
    this.logger.log(`Data processing blocked for user ${userId}: ${reason}`);
  }

  async unblockProcessing(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET data_processing_blocked = false, block_reason = NULL, blocked_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );
  }

  /* ── Consent Revocation ── */

  async revokePrivacyConsent(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET privacy_accepted_at = NULL, privacy_policy_version = NULL, updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );
    this.logger.log(`Privacy consent revoked by user ${userId}`);
  }

  /* ── Rectification Request ── */

  async createRectificationRequest(
    userId: string,
    tenantId: string,
    dto: { fieldName: string; requestedValue: string; reason?: string },
  ) {
    // Get current value
    const userRows = await this.dataSource.query(
      `SELECT email, display_name FROM users WHERE id = $1`,
      [userId],
    );
    const currentValue = dto.fieldName === 'email'
      ? userRows[0]?.email
      : userRows[0]?.display_name;

    const rows = await this.dataSource.query(
      `INSERT INTO rectification_requests (user_id, tenant_id, field_name, current_value, requested_value, reason, response_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '21 days')
       RETURNING id, requested_at, response_deadline`,
      [userId, tenantId, dto.fieldName, currentValue, dto.requestedValue, dto.reason ?? null],
    );

    this.logger.log(`Rectification request created for user ${userId}: ${dto.fieldName}`);
    return {
      requestId: rows[0].id,
      requestedAt: rows[0].requested_at,
      responseDeadline: rows[0].response_deadline,
    };
  }
}
