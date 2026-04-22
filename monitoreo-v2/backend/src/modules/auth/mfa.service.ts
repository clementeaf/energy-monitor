import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TOTP, generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';

const ISSUER = 'EnergyMonitor';

@Injectable()
export class MfaService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Generate a new TOTP secret and QR code for setup.
   * Does NOT enable MFA yet — user must verify first.
   */
  async setupMfa(userId: string, userEmail: string): Promise<{ secret: string; qrDataUrl: string; otpauthUrl: string }> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: ISSUER, label: userEmail, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.dataSource.query(
      `UPDATE users SET mfa_secret = $1, mfa_enabled = false WHERE id = $2`,
      [secret, userId],
    );

    return { secret, qrDataUrl, otpauthUrl };
  }

  /**
   * Verify a TOTP code against the stored secret and enable MFA.
   */
  async verifyAndEnable(userId: string, code: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT mfa_secret FROM users WHERE id = $1`,
      [userId],
    );

    if (rows.length === 0 || !rows[0].mfa_secret) {
      throw new BadRequestException('MFA setup not initiated. Call /auth/mfa/setup first.');
    }

    const result = verifySync({ token: code, secret: rows[0].mfa_secret });

    if (!result.valid) {
      throw new BadRequestException('Invalid verification code.');
    }

    await this.dataSource.query(
      `UPDATE users SET mfa_enabled = true WHERE id = $1`,
      [userId],
    );

    return true;
  }

  /**
   * Validate a TOTP code during login (user already has MFA enabled).
   */
  async validate(userId: string, code: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1`,
      [userId],
    );

    if (rows.length === 0 || !rows[0].mfa_enabled || !rows[0].mfa_secret) {
      return true; // MFA not enabled, skip
    }

    return verifySync({ token: code, secret: rows[0].mfa_secret }).valid;
  }

  /**
   * Check if a user has MFA enabled.
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT mfa_enabled FROM users WHERE id = $1`,
      [userId],
    );
    return rows.length > 0 && rows[0].mfa_enabled === true;
  }

  /**
   * Disable MFA for a user.
   */
  async disable(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET mfa_secret = NULL, mfa_enabled = false WHERE id = $1`,
      [userId],
    );
  }
}
