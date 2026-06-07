import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { randomBytes, createHash } from 'crypto';
import { encryptPii, decryptPii } from '../../common/crypto/pii-encryption';

const ISSUER = 'EnergyMonitor';
const RECOVERY_CODE_COUNT = 8;
const TOTP_EPOCH_TOLERANCE = 1;

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
    options?: { forceRegenerate?: boolean },
  ): Promise<{ secret: string; qrDataUrl: string; otpauthUrl: string }> {
    const rows = await this.dataSource.query<{ mfa_secret: string | null; mfa_enabled: boolean }[]>(
      `SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1`,
      [userId],
    );
    const row = rows[0];
    let secret: string;

    if (!options?.forceRegenerate && row?.mfa_secret && row.mfa_enabled === false) {
      secret = decryptPii(row.mfa_secret);
      this.logger.log(`Reusing pending MFA secret for user ${userId}`);
    } else {
      secret = generateSecret();
      await this.dataSource.query(
        `UPDATE users SET mfa_secret = $1, mfa_enabled = false, mfa_recovery_codes = NULL WHERE id = $2`,
        [encryptPii(secret), userId],
      );
    }

    const otpauthUrl = generateURI({
      issuer: ISSUER,
      label: userEmail,
      secret,
      algorithm: 'sha1',
      digits: 6,
      period: 30,
    });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, qrDataUrl, otpauthUrl };
  }

  /**
   * Verifies first-time MFA setup during login (public endpoint, pending secret only).
   * @param userId - User completing OAuth login MFA enrollment
   * @param code - 6-digit TOTP from authenticator app
   * @returns Recovery codes when enrollment succeeds
   */
  async verifyAndEnableDuringLogin(
    userId: string,
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
    const rows = await this.dataSource.query<{ mfa_secret: string | null; mfa_enabled: boolean }[]>(
      `SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1`,
      [userId],
    );

    if (rows.length === 0 || rows[0].mfa_enabled || !rows[0].mfa_secret) {
      throw new BadRequestException('MFA setup not available for this user.');
    }

    return this.verifyAndEnable(userId, code);
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

    const secret = decryptPii(rows[0].mfa_secret);
    const result = verifySync({
      token: code.trim(),
      secret,
      epochTolerance: TOTP_EPOCH_TOLERANCE,
    });

    if (!result.valid) {
      throw new BadRequestException(
        'Invalid verification code. Use the code from the QR shown on this screen (delete old EnergyMonitor entries in your app).',
      );
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
    const decryptedSecret = decryptPii(rows[0].mfa_secret);
    const totpValid = verifySync({
      token: code.trim(),
      secret: decryptedSecret,
      epochTolerance: TOTP_EPOCH_TOLERANCE,
    }).valid;
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
