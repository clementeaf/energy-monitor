import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { randomBytes, createHash } from 'crypto';

const ISSUER = 'EnergyMonitor';
const RECOVERY_CODE_COUNT = 8;

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Generate a new TOTP secret and QR code for setup.
   * Does NOT enable MFA yet — user must verify first.
   */
  async setupMfa(
    userId: string,
    userEmail: string,
  ): Promise<{ secret: string; qrDataUrl: string; otpauthUrl: string }> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: ISSUER, label: userEmail, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.dataSource.query(
      `UPDATE users SET mfa_secret = $1, mfa_enabled = false, mfa_recovery_codes = NULL WHERE id = $2`,
      [secret, userId],
    );

    return { secret, qrDataUrl, otpauthUrl };
  }

  /**
   * Verify a TOTP code against the stored secret, enable MFA, and generate recovery codes.
   */
  async verifyAndEnable(
    userId: string,
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
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

    const recoveryCodes = this.generateRecoveryCodes();
    const hashedCodes = recoveryCodes.map((c) => this.hashCode(c));

    await this.dataSource.query(
      `UPDATE users SET mfa_enabled = true, mfa_recovery_codes = $1 WHERE id = $2`,
      [JSON.stringify(hashedCodes), userId],
    );

    await this.logAuditEvent(userId, 'MFA_ENABLED');

    return { recoveryCodes };
  }

  /**
   * Validate a TOTP code or recovery code during login.
   */
  async validate(userId: string, code: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT mfa_secret, mfa_enabled, mfa_recovery_codes FROM users WHERE id = $1`,
      [userId],
    );

    if (rows.length === 0 || !rows[0].mfa_enabled || !rows[0].mfa_secret) {
      // MFA not enabled — reject. This endpoint should only be called
      // for users who triggered mfaRequired during login.
      return false;
    }

    // Try TOTP first
    const totpValid = verifySync({ token: code, secret: rows[0].mfa_secret }).valid;
    if (totpValid) {
      return true;
    }

    // Try recovery code
    return this.consumeRecoveryCode(userId, code, rows[0].mfa_recovery_codes);
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
      `UPDATE users SET mfa_secret = NULL, mfa_enabled = false, mfa_recovery_codes = NULL WHERE id = $1`,
      [userId],
    );
    await this.logAuditEvent(userId, 'MFA_DISABLED');
  }

  /**
   * Get remaining recovery code count.
   */
  async getRecoveryCodeCount(userId: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT mfa_recovery_codes FROM users WHERE id = $1`,
      [userId],
    );
    if (rows.length === 0 || !rows[0].mfa_recovery_codes) return 0;
    const codes: string[] = JSON.parse(rows[0].mfa_recovery_codes);
    return codes.length;
  }

  private generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
      const raw = randomBytes(4).toString('hex'); // 8 hex chars
      codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
    }
    return codes;
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code.replace('-', '')).digest('hex');
  }

  private async consumeRecoveryCode(
    userId: string,
    code: string,
    storedCodesJson: string | null,
  ): Promise<boolean> {
    if (!storedCodesJson) return false;

    const hashedCodes: string[] = JSON.parse(storedCodesJson);
    const inputHash = this.hashCode(code);
    const idx = hashedCodes.indexOf(inputHash);

    if (idx === -1) return false;

    // Remove used code
    hashedCodes.splice(idx, 1);
    await this.dataSource.query(
      `UPDATE users SET mfa_recovery_codes = $1 WHERE id = $2`,
      [JSON.stringify(hashedCodes), userId],
    );

    this.logger.warn(`Recovery code used for user ${userId}. ${hashedCodes.length} remaining.`);
    await this.logAuditEvent(userId, 'MFA_RECOVERY_CODE_USED');

    return true;
  }

  private async logAuditEvent(userId: string, action: string): Promise<void> {
    try {
      const rows = await this.dataSource.query(
        `SELECT tenant_id FROM users WHERE id = $1`,
        [userId],
      );
      const tenantId = rows.length > 0 ? rows[0].tenant_id : null;

      await this.dataSource.query(
        `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, 'Auth', $4, $5)`,
        [tenantId, userId, action, userId, JSON.stringify({ event: action })],
      );
    } catch (err) {
      this.logger.warn(`Audit log write failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }
}
