import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';

/**
 * Data retention cron — Ley 21.719 compliance.
 * Runs daily at 04:00 Chile (UTC-4 → 08:00 UTC).
 *
 * 1. Purge expired refresh tokens (>30 days past expiry)
 * 2. Anonymize users inactive for >2 years (no login, no activity)
 */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron('0 8 * * *', { name: 'data-retention' })
  async run(): Promise<void> {
    this.logger.log('Data retention: starting cycle');

    const purged = await this.purgeExpiredTokens();
    const anonymized = await this.anonymizeInactiveUsers();

    this.logger.log(
      `Data retention: done — ${purged} tokens purged, ${anonymized} users anonymized`,
    );
  }

  /**
   * Delete refresh tokens that expired >30 days ago.
   * These are useless and contain IP + user-agent PII.
   */
  private async purgeExpiredTokens(): Promise<number> {
    const result = await this.dataSource.query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < NOW() - INTERVAL '30 days'
       OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')`,
    );
    const count = result[1] ?? 0;
    if (count > 0) {
      this.logger.log(`Purged ${count} expired refresh tokens`);
    }
    return count;
  }

  /**
   * Anonymize users who haven't logged in for >2 years.
   * Replaces PII with hashed values, deactivates account.
   * Audit logs are preserved with the user_id reference (anonymized email prevents re-identification).
   */
  private async anonymizeInactiveUsers(): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT id, email FROM users
       WHERE is_active = true
         AND last_login_at < NOW() - INTERVAL '2 years'
         AND email NOT LIKE 'deleted-%@anonymized.local'`,
    );

    for (const row of rows) {
      const emailHash = createHash('sha256')
        .update(row.email)
        .digest('hex')
        .substring(0, 16);
      const anonymizedEmail = `deleted-${emailHash}@anonymized.local`;

      await this.dataSource.query(
        `UPDATE users SET
           email = $1,
           display_name = NULL,
           auth_provider_id = $2,
           mfa_secret = NULL,
           mfa_enabled = false,
           mfa_recovery_codes = NULL,
           privacy_accepted_at = NULL,
           privacy_policy_version = NULL,
           is_active = false,
           updated_at = NOW()
         WHERE id = $3`,
        [anonymizedEmail, emailHash, row.id],
      );

      await this.dataSource.query(
        `DELETE FROM user_building_access WHERE user_id = $1`,
        [row.id],
      );

      await this.dataSource.query(
        `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'retention_policy'
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [row.id],
      );

      this.logger.log(`Retention: anonymized inactive user ${row.id}`);
    }

    return rows.length;
  }
}
