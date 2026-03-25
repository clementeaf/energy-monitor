import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

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
  ) {}

  async validateOAuthLogin(profile: OAuthProfile): Promise<TokenPair> {
    // Find user by provider + providerId
    const rows = await this.dataSource.query(
      `SELECT u.id, u.tenant_id, u.email, u.role, u.is_active
       FROM users u
       WHERE u.auth_provider = $1 AND u.auth_provider_id = $2`,
      [profile.provider, profile.providerId],
    );

    if (rows.length === 0) {
      this.logger.warn(`OAuth login failed: user not found (${profile.email})`);
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

    return this.generateTokenPair({
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
    });
  }

  async generateTokenPair(payload: JwtPayload): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
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
        `SELECT rt.id, rt.user_id, u.email, u.tenant_id, u.role, u.is_active
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
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

      return this.generateTokenPair({
        sub: row.user_id,
        email: row.email,
        tenantId: row.tenant_id,
        role: row.role,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async revokeAllTokens(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'logout_all' WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }
}
