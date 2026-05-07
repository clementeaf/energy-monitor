import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { decryptPii, encryptPii, isPiiEncrypted, hmacPii } from '../../common/crypto/pii-encryption';

@Injectable()
export class RectificationRequestsService {
  private readonly logger = new Logger(RectificationRequestsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async findAll(tenantId: string) {
    const rows = await this.dataSource.query(
      `SELECT rr.id, rr.user_id, rr.field_name, rr.current_value, rr.requested_value,
              rr.reason, rr.status, rr.requested_at, rr.response_deadline,
              rr.resolved_at, rr.resolved_by, rr.notes,
              u.email, u.display_name,
              resolver.email AS resolved_by_email
       FROM rectification_requests rr
       JOIN users u ON u.id = rr.user_id
       LEFT JOIN users resolver ON resolver.id = rr.resolved_by
       WHERE rr.tenant_id = $1
       ORDER BY rr.requested_at DESC`,
      [tenantId],
    );

    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: isPiiEncrypted(r.email as string) ? decryptPii(r.email as string) : r.email,
      userDisplayName: r.display_name ? (isPiiEncrypted(r.display_name as string) ? decryptPii(r.display_name as string) : r.display_name) : null,
      fieldName: r.field_name,
      currentValue: r.current_value,
      requestedValue: r.requested_value,
      reason: r.reason,
      status: r.status,
      requestedAt: r.requested_at,
      responseDeadline: r.response_deadline,
      resolvedAt: r.resolved_at,
      resolvedByEmail: r.resolved_by_email ? (isPiiEncrypted(r.resolved_by_email as string) ? decryptPii(r.resolved_by_email as string) : r.resolved_by_email) : null,
      notes: r.notes,
    }));
  }

  async resolve(id: string, resolvedBy: string, dto: { status: 'approved' | 'rejected'; notes?: string }) {
    const rows = await this.dataSource.query(
      `SELECT id, status FROM rectification_requests WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Request not found');
    if (rows[0].status !== 'pending') {
      throw new BadRequestException(`Request already ${rows[0].status}`);
    }

    await this.dataSource.query(
      `UPDATE rectification_requests
       SET status = $1, resolved_at = NOW(), resolved_by = $2, notes = $3
       WHERE id = $4`,
      [dto.status, resolvedBy, dto.notes ?? null, id],
    );

    this.logger.log(`Rectification request ${id} ${dto.status} by ${resolvedBy}`);
    return { success: true, status: dto.status };
  }

  /**
   * Execute an approved rectification: apply the requested value to the user record.
   * Only 'email' and 'displayName' fields are supported.
   */
  async execute(id: string, executedBy: string) {
    const rows = await this.dataSource.query(
      `SELECT rr.id, rr.user_id, rr.field_name, rr.requested_value, rr.status
       FROM rectification_requests rr
       WHERE rr.id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Request not found');
    if (rows[0].status !== 'approved') {
      throw new BadRequestException('Request must be approved before execution');
    }

    const { user_id: userId, field_name: fieldName, requested_value: requestedValue } = rows[0];

    if (fieldName === 'email') {
      await this.dataSource.query(
        `UPDATE users SET email = $1, email_hmac = $2, updated_at = NOW() WHERE id = $3`,
        [encryptPii(requestedValue), hmacPii(requestedValue), userId],
      );
    } else if (fieldName === 'displayName') {
      await this.dataSource.query(
        `UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2`,
        [encryptPii(requestedValue), userId],
      );
    }

    await this.dataSource.query(
      `UPDATE rectification_requests
       SET status = 'executed', resolved_at = NOW(), resolved_by = $1
       WHERE id = $2`,
      [executedBy, id],
    );

    // Audit trail
    try {
      const userRows = await this.dataSource.query(`SELECT tenant_id FROM users WHERE id = $1`, [userId]);
      await this.dataSource.query(
        `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, 'RECTIFICATION_EXECUTED', 'ARCO+', $3, $4)`,
        [userRows[0]?.tenant_id, executedBy, userId, JSON.stringify({ field: fieldName, newValue: fieldName === 'email' ? '***' : requestedValue })],
      );
    } catch {
      this.logger.warn(`ARCO+ audit write failed for RECTIFICATION_EXECUTED`);
    }

    this.logger.log(`Rectification ${id} executed: ${fieldName} updated for user ${userId} by ${executedBy}`);
    return { success: true, field: fieldName };
  }
}
