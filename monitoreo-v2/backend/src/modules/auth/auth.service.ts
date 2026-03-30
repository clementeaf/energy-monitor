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
              r.slug AS role_slug, r.name AS role_name
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
    };
  }

  async validateOAuthLogin(profile: OAuthProfile): Promise<TokenPair> {
    // 1. Try exact match: provider + providerId
    let rows = await this.dataSource.query(
      `SELECT u.id, u.tenant_id, u.email, u.role_id, u.is_active,
              r.slug AS role_slug
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.auth_provider = $1 AND u.auth_provider_id = $2`,
      [profile.provider, profile.providerId],
    );

    // 2. Fallback: match by email (allows login with either provider)
    if (rows.length === 0) {
      rows = await this.dataSource.query(
        `SELECT u.id, u.tenant_id, u.email, u.role_id, u.is_active,
                r.slug AS role_slug
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
          `Linked ${profile.provider} to existing user ${profile.email}`,
        );
      }
    }

    if (rows.length === 0) {
      this.logger.warn(
        `OAuth login failed: user not found — provider=${profile.provider} providerId=${profile.providerId} email=${profile.email} displayName=${profile.displayName}`,
      );
      throw new UnauthorizedException('User not registered. Contact your administrator.');
    }

    const user = rows[0];
    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated.');
    }

    // Update last login
    await this.dataSource.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [user.id],
    );

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
        await queryRunner.rollbackTransaction();
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

  async revokeAllTokens(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'logout_all' WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }
}
