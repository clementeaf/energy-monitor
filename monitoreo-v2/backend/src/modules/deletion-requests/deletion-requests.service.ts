import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import type { ResolveDeletionDto } from './dto/resolve-deletion.dto';

@Injectable()
export class DeletionRequestsService {
  private readonly logger = new Logger(DeletionRequestsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async findAll(tenantId: string) {
    const rows = await this.dataSource.query(
      `SELECT dr.id, dr.user_id, dr.reason, dr.status, dr.requested_at,
              dr.resolved_at, dr.notes,
              u.email, u.display_name,
              resolver.email AS resolved_by_email
       FROM deletion_requests dr
       JOIN users u ON u.id = dr.user_id
       LEFT JOIN users resolver ON resolver.id = dr.resolved_by
       WHERE dr.tenant_id = $1
       ORDER BY dr.requested_at DESC`,
      [tenantId],
    );

    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.email,
      userDisplayName: r.display_name,
      reason: r.reason,
      status: r.status,
      requestedAt: r.requested_at,
      resolvedAt: r.resolved_at,
      resolvedByEmail: r.resolved_by_email,
      notes: r.notes,
    }));
  }

  async resolve(id: string, resolvedBy: string, dto: ResolveDeletionDto) {
    const rows = await this.dataSource.query(
      `SELECT id, status FROM deletion_requests WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Request not found');
    if (rows[0].status !== 'pending') {
      throw new BadRequestException(`Request already ${rows[0].status}`);
    }

    await this.dataSource.query(
      `UPDATE deletion_requests
       SET status = $1, resolved_at = NOW(), resolved_by = $2, notes = $3
       WHERE id = $4`,
      [dto.status, resolvedBy, dto.notes ?? null, id],
    );

    this.logger.log(`Deletion request ${id} ${dto.status} by ${resolvedBy}`);
    return { success: true, status: dto.status };
  }

  /**
   * Execute an approved deletion request:
   * 1. Anonymize user PII (email → hash, displayName → null, authProviderId → hash)
   * 2. Clear MFA secrets
   * 3. Deactivate user
   * 4. Revoke all tokens
   * 5. Mark request as executed
   *
   * Audit logs are NOT deleted (ISO 27001) but user_id remains for traceability.
   * The anonymized email (SHA-256 hash) prevents re-identification.
   */
  async execute(id: string, executedBy: string) {
    const rows = await this.dataSource.query(
      `SELECT dr.id, dr.user_id, dr.status, u.email
       FROM deletion_requests dr
       JOIN users u ON u.id = dr.user_id
       WHERE dr.id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Request not found');
    if (rows[0].status !== 'approved') {
      throw new BadRequestException('Request must be approved before execution');
    }

    const userId = rows[0].user_id;
    const emailHash = createHash('sha256').update(rows[0].email).digest('hex').substring(0, 16);
    const anonymizedEmail = `deleted-${emailHash}@anonymized.local`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Anonymize user PII
      await queryRunner.query(
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
        [anonymizedEmail, emailHash, userId],
      );

      // 2. Revoke all refresh tokens
      await queryRunner.query(
        `UPDATE refresh_tokens SET revoked_at = NOW(), revoked_reason = 'account_deleted'
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      );

      // 3. Remove building access
      await queryRunner.query(
        `DELETE FROM user_building_access WHERE user_id = $1`,
        [userId],
      );

      // 4. Mark request as executed
      await queryRunner.query(
        `UPDATE deletion_requests
         SET status = 'executed', resolved_at = NOW(), resolved_by = $1
         WHERE id = $2`,
        [executedBy, id],
      );

      await queryRunner.commitTransaction();

      this.logger.log(`User ${userId} PII anonymized — deletion request ${id} executed by ${executedBy}`);
      return { success: true, anonymizedEmail };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
