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
import { encryptPii, decryptPii, hmacPii, isPiiEncrypted } from '../../common/crypto/pii-encryption';
import {
  getBlockConcurrentSessions,
  getIdleTimeoutMinutes,
  getSsoDefaultRoleSlug,
  resolveSessionMinutes,
} from '../../lib/tenant-settings';
import { TenantsService } from '../tenants/tenants.service';
import { JwtBlacklistService } from './jwt-blacklist.service';

export interface OAuthProfile {
  provider: 'microsoft' | 'google';
  providerId: string;
  email: string;
  displayName: string;
}

export interface SsoProfile {
  provider: 'oidc';
  providerId: string;
  email: string;
  displayName: string;
  tenantId: string;
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
    private readonly tenantsService: TenantsService,
    private readonly jwtBlacklist: JwtBlacklistService,
  ) {}

  async getUserProfile(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT u.id, u.email, u.display_name, u.role_id, u.auth_provider, u.last_login_at,
              u.privacy_accepted_at, u.privacy_policy_version, u.mfa_enabled,
              u.data_processing_blocked, u.opt_out_automated_decisions,
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
    return this.buildUserProfile(row, permissions, buildings);
  }

  /**
   * Returns the same payload as GET /auth/me for post-MFA session bootstrap.
   * @param userId - Authenticated user id
   * @returns User profile and tenant theme
   */
  async getMeResponse(userId: string): Promise<{
    user: Awaited<ReturnType<AuthService['buildUserProfile']>>;
    tenant: Awaited<ReturnType<TenantsService['getTheme']>>;
    idleTimeoutMinutes: number;
  }> {
    const user = await this.getUserProfile(userId);
    const rows = await this.dataSource.query<{ tenant_id: string }[]>(
      `SELECT tenant_id FROM users WHERE id = $1 AND is_active = true`,
      [userId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('User not found');
    }
    const tenant = await this.tenantsService.getTheme(rows[0].tenant_id);
    const tenantFull = await this.tenantsService.findById(rows[0].tenant_id);
    const idleTimeoutMinutes = getIdleTimeoutMinutes(tenantFull.settings);
    return { user, tenant, idleTimeoutMinutes };
  }

  private buildUserProfile(
    row: {
      id: string;
      email: string;
      display_name: string | null;
      role_id: string;
      auth_provider: string;
      last_login_at: Date | string | null;
      privacy_accepted_at: Date | string | null;
      privacy_policy_version: string | null;
      mfa_enabled: boolean;
      data_processing_blocked: boolean;
      opt_out_automated_decisions: boolean;
      role_slug: string;
      role_name: string;
      require_mfa: boolean;
    },
    permissions: { module: string; action: string }[],
    buildings: { id: string; name: string }[],
  ) {
    const privacyAccepted =
      row.privacy_accepted_at != null &&
      row.privacy_policy_version === PRIVACY_POLICY_VERSION;
    const requireMfaSetup = row.require_mfa && !row.mfa_enabled;

    return {
      id: row.id,
      email: isPiiEncrypted(row.email) ? decryptPii(row.email) : row.email,
      displayName: row.display_name ? (isPiiEncrypted(row.display_name) ? decryptPii(row.display_name) : row.display_name) : null,
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
      optOutAutomatedDecisions: row.opt_out_automated_decisions,
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

    // 2. Fallback: match by email or HMAC (allows login with either provider)
    if (rows.length === 0) {
      const emailHmac = hmacPii(profile.email);
      rows = await this.dataSource.query(
        `SELECT u.id, u.tenant_id, u.email, u.role_id, u.is_active,
                r.slug AS role_slug, r.require_mfa
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.email = $1 OR u.email_hmac = $2`,
        [profile.email, emailHmac],
      );

      if (rows.length > 0 && rows[0].is_active) {
        // Encrypt PII on provider link (progressive encryption)
        await this.dataSource.query(
          `UPDATE users SET auth_provider = $1, auth_provider_id = $2,
           email = $3, email_hmac = $4, display_name = $5
           WHERE id = $6`,
          [
            profile.provider,
            profile.providerId,
            encryptPii(profile.email),
            emailHmac,
            profile.displayName ? encryptPii(profile.displayName) : null,
            rows[0].id,
          ],
        );
        this.logger.log(
          `Linked ${profile.provider} to existing user ${maskEmail(profile.email)} (PII encrypted)`,
        );
      }
    }

    if (rows.length === 0) {
      this.logger.warn(
        `OAuth login failed: user not found — provider=${profile.provider} providerId=${maskProviderId(profile.providerId)} email=${maskEmail(profile.email)}`,
      );
      throw new UnauthorizedException('Authentication failed.');
    }

    return this.completeLoginForUserRow(rows[0], profile.email, profile.displayName);
  }

  /**
   * Validates enterprise SSO login with optional JIT user provisioning.
   */
  async validateSsoLogin(profile: SsoProfile): Promise<
    TokenPair
    | { mfaRequired: true; userId: string }
    | { mfaSetupRequired: true; userId: string }
  > {
    let rows = await this.dataSource.query(
      `SELECT u.id, u.tenant_id, u.email, u.role_id, u.is_active,
              r.slug AS role_slug, r.require_mfa
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.tenant_id = $1 AND u.auth_provider = $2 AND u.auth_provider_id = $3`,
      [profile.tenantId, profile.provider, profile.providerId],
    );

    if (rows.length === 0) {
      const emailHmac = hmacPii(profile.email);
      rows = await this.dataSource.query(
        `SELECT u.id, u.tenant_id, u.email, u.role_id, u.is_active,
                r.slug AS role_slug, r.require_mfa
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.tenant_id = $1 AND (u.email = $2 OR u.email_hmac = $3)`,
        [profile.tenantId, profile.email, emailHmac],
      );

      if (rows.length > 0 && rows[0].is_active) {
        await this.dataSource.query(
          `UPDATE users SET auth_provider = $1, auth_provider_id = $2,
           email = $3, email_hmac = $4, display_name = $5
           WHERE id = $6`,
          [
            profile.provider,
            profile.providerId,
            encryptPii(profile.email),
            emailHmac,
            profile.displayName ? encryptPii(profile.displayName) : null,
            rows[0].id,
          ],
        );
      }
    }

    if (rows.length === 0) {
      const userId = await this.provisionJitUser(profile);
      rows = await this.dataSource.query(
        `SELECT u.id, u.tenant_id, u.email, u.role_id, u.is_active,
                r.slug AS role_slug, r.require_mfa
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1`,
        [userId],
      );
      this.logger.log(`JIT SSO user provisioned: ${maskEmail(profile.email)} tenant=${profile.tenantId}`);
    }

    if (rows.length === 0) {
      throw new UnauthorizedException('Authentication failed.');
    }

    return this.completeLoginForUserRow(rows[0], profile.email, profile.displayName);
  }

  /**
   * Creates a user on first SSO login (JIT provisioning).
   */
  async provisionJitUser(profile: SsoProfile): Promise<string> {
    const tenant = await this.tenantsService.findById(profile.tenantId);
    const roleSlug = getSsoDefaultRoleSlug(tenant.settings);
    const roleRows = await this.dataSource.query(
      `SELECT id FROM roles WHERE tenant_id = $1 AND slug = $2 AND is_active = true LIMIT 1`,
      [profile.tenantId, roleSlug],
    );
    if (roleRows.length === 0) {
      throw new UnauthorizedException('SSO default role not configured.');
    }
    const emailHmac = hmacPii(profile.email);
    const inserted = await this.dataSource.query(
      `INSERT INTO users (tenant_id, email, email_hmac, display_name, auth_provider, auth_provider_id, role_id, is_active, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
       RETURNING id`,
      [
        profile.tenantId,
        encryptPii(profile.email),
        emailHmac,
        profile.displayName ? encryptPii(profile.displayName) : null,
        profile.provider,
        profile.providerId,
        roleRows[0].id,
      ],
    );
    return inserted[0].id as string;
  }

  private async completeLoginForUserRow(
    user: {
      id: string;
      tenant_id: string;
      email: string;
      role_id: string;
      is_active: boolean;
      role_slug: string;
      require_mfa: boolean;
    },
    profileEmail: string,
    profileDisplayName: string,
  ): Promise<
    TokenPair
    | { mfaRequired: true; userId: string }
    | { mfaSetupRequired: true; userId: string }
  > {
    if (!user.is_active) {
      throw new UnauthorizedException('Authentication failed.');
    }

    if (!isPiiEncrypted(user.email)) {
      await this.dataSource.query(
        `UPDATE users SET last_login_at = NOW(), email = $1, email_hmac = $2,
         display_name = CASE WHEN display_name IS NOT NULL AND display_name NOT LIKE 'pii:%' THEN $3 ELSE display_name END
         WHERE id = $4`,
        [
          encryptPii(profileEmail),
          hmacPii(profileEmail),
          profileDisplayName ? encryptPii(profileDisplayName) : null,
          user.id,
        ],
      );
    } else {
      await this.dataSource.query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
        [user.id],
      );
    }

    const mfaRows = await this.dataSource.query(
      `SELECT mfa_enabled FROM users WHERE id = $1`,
      [user.id],
    );
    if (mfaRows.length > 0 && mfaRows[0].mfa_enabled) {
      return { mfaRequired: true, userId: user.id };
    }
    if (user.require_mfa && !mfaRows[0]?.mfa_enabled) {
      return { mfaSetupRequired: true, userId: user.id };
    }

    const permissions = await this.rolesService.getPermissionsByRoleId(user.role_id);
    const permissionStrings = permissions.map((p) => `${p.module}:${p.action}`);
    const buildingIds = await this.rolesService.getUserBuildingIds(user.id);
    const sessionMinutes = await this.resolveSessionMinutesForUser(user.tenant_id, user.id);

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
      sessionMinutes,
      user.tenant_id,
    );
  }

  private async resolveSessionMinutesForUser(tenantId: string, userId: string): Promise<number> {
    const tenant = await this.tenantsService.findById(tenantId);
    const role = await this.rolesService.getRoleByUserId(userId);
    return resolveSessionMinutes(tenant.settings, role?.maxSessionMinutes ?? 1440);
  }

  /**
   * Access token TTL — short-lived (15 min). Refresh token handles session duration.
   * A stolen access token expires quickly; refresh endpoint checks is_active + theft detection.
   */
  private static readonly ACCESS_TOKEN_MINUTES = 15;

  async generateTokenPair(payload: JwtPayload, sessionMinutes = 1440, tenantId?: string): Promise<TokenPair> {
    if (tenantId) {
      const tenant = await this.tenantsService.findById(tenantId);
      if (getBlockConcurrentSessions(tenant.settings)) {
        await this.revokeAllTokens(payload.sub);
      }
    }

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${AuthService.ACCESS_TOKEN_MINUTES}m`,
    });

    const refreshTokenRaw = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');

    await this.dataSource.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + $3 * INTERVAL '1 minute')`,
      [payload.sub, tokenHash, sessionMinutes],
    );

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let transactionEnded = false;

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
        transactionEnded = true;
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }

      const row = rows[0];
      if (!row.is_active) {
        await queryRunner.rollbackTransaction();
        transactionEnded = true;
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
      const sessionMinutes = await this.resolveSessionMinutesForUser(row.tenant_id, row.user_id);

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
        sessionMinutes,
        row.tenant_id,
      );
    } catch (err) {
      if (!transactionEnded) await queryRunner.rollbackTransaction();
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
    const sessionMinutes = await this.resolveSessionMinutesForUser(user.tenant_id, userId);

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
      sessionMinutes,
      user.tenant_id,
    );
  }

  async updateProfile(userId: string, dto: { displayName?: string }): Promise<void> {
    if (dto.displayName !== undefined) {
      await this.dataSource.query(
        `UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2`,
        [encryptPii(dto.displayName), userId],
      );
      await this.auditArcoAction(userId, 'RECTIFICATION_SELF_SERVICE', { field: 'displayName' });
    }
  }

  async revokeAllTokens(userId: string): Promise<void> {
    // Blacklist all outstanding access tokens for this user in Redis
    await this.jwtBlacklist.blacklistUser(userId);
    await this.dataSource.query(
      `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'logout_all' WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  /* ── CYB-21: Login audit with IP + result ── */

  /**
   * Writes an explicit login audit log with IP, user-agent, and auth result.
   * Called by controller after successful login or MFA validation.
   */
  async writeLoginAudit(params: {
    userId: string;
    tenantId: string;
    action: 'LOGIN_SUCCESS' | 'LOGIN_MFA_PENDING' | 'LOGIN_MFA_SUCCESS' | 'LOGIN_FAILED';
    provider: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, 'session', $4, $5, $6::inet, $7)`,
        [
          params.tenantId,
          params.userId,
          params.action,
          params.userId,
          JSON.stringify({ provider: params.provider }),
          params.ipAddress,
          params.userAgent,
        ],
      );
    } catch {
      this.logger.warn(`Login audit write failed for ${params.action} user=${params.userId}`);
    }
  }

  /* ── Ley 21.719: Privacy & Data Rights ── */

  /** Audit trail for ARCO+ right exercises — required by Ley 21.719 for traceability. */
  private async auditArcoAction(userId: string, action: string, details?: Record<string, unknown>): Promise<void> {
    try {
      const rows = await this.dataSource.query(`SELECT tenant_id FROM users WHERE id = $1`, [userId]);
      const tenantId = rows[0]?.tenant_id ?? null;
      await this.dataSource.query(
        `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, 'ARCO+', $4, $5)`,
        [tenantId, userId, action, userId, JSON.stringify(details ?? { event: action })],
      );
    } catch {
      this.logger.warn(`ARCO+ audit write failed for ${action}`);
    }
  }

  async acceptPrivacyPolicy(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET privacy_accepted_at = NOW(), privacy_policy_version = $1 WHERE id = $2`,
      [PRIVACY_POLICY_VERSION, userId],
    );
    await this.auditArcoAction(userId, 'PRIVACY_CONSENT_ACCEPTED', { version: PRIVACY_POLICY_VERSION });
    this.logger.log(`Privacy policy v${PRIVACY_POLICY_VERSION} accepted by user ${userId}`);
  }

  /**
   * Export all personal data for a user (ARCO+ access + portability).
   */
  async exportUserData(userId: string) {
    await this.auditArcoAction(userId, 'DATA_EXPORT', { right: 'access+portability' });
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
       ORDER BY created_at DESC`,
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
        email: isPiiEncrypted(user.email) ? decryptPii(user.email) : user.email,
        displayName: user.display_name ? (isPiiEncrypted(user.display_name) ? decryptPii(user.display_name) : user.display_name) : null,
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

    await this.auditArcoAction(userId, 'DELETION_REQUESTED', { requestId: rows[0].id });
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
    await this.auditArcoAction(userId, 'PROCESSING_BLOCKED', { reason });
    this.logger.log(`Data processing blocked for user ${userId}: ${reason}`);
  }

  async setAutomatedDecisionsOptOut(userId: string, optOut: boolean): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET opt_out_automated_decisions = $1, updated_at = NOW() WHERE id = $2`,
      [optOut, userId],
    );
    await this.auditArcoAction(userId, optOut ? 'AUTOMATED_DECISIONS_OPT_OUT' : 'AUTOMATED_DECISIONS_OPT_IN');
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
    await this.auditArcoAction(userId, 'CONSENT_REVOKED');
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

    await this.auditArcoAction(userId, 'RECTIFICATION_REQUESTED', { field: dto.fieldName, requestedValue: dto.requestedValue });
    this.logger.log(`Rectification request created for user ${userId}: ${dto.fieldName}`);
    return {
      requestId: rows[0].id,
      requestedAt: rows[0].requested_at,
      responseDeadline: rows[0].response_deadline,
    };
  }
}
