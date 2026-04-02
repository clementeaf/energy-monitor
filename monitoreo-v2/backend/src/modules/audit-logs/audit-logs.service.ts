import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

export interface AuditLogEntry {
  id: string;
  tenantId: string | null;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogResult {
  data: AuditLogEntry[];
  total: number;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(tenantId: string, dto: QueryAuditLogsDto): Promise<AuditLogResult> {
    const conditions: string[] = ['a.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (dto.userId) {
      conditions.push(`a.user_id = $${idx++}`);
      params.push(dto.userId);
    }
    if (dto.action) {
      conditions.push(`a.action ILIKE $${idx++}`);
      params.push(`%${dto.action}%`);
    }
    if (dto.resourceType) {
      conditions.push(`a.resource_type = $${idx++}`);
      params.push(dto.resourceType);
    }
    if (dto.from) {
      conditions.push(`a.created_at >= $${idx++}`);
      params.push(dto.from);
    }
    if (dto.to) {
      conditions.push(`a.created_at <= $${idx++}`);
      params.push(dto.to);
    }

    const where = conditions.join(' AND ');
    const limit = dto.limit ?? 50;
    const offset = dto.offset ?? 0;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT a.id, a.tenant_id, a.user_id, u.email AS user_email,
                a.action, a.resource_type, a.resource_id, a.details,
                a.ip_address, a.user_agent, a.created_at
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         WHERE ${where}
         ORDER BY a.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset],
      ),
      this.dataSource.query(
        `SELECT count(*)::int AS total FROM audit_logs a WHERE ${where}`,
        params,
      ),
    ]);

    return {
      data: rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        tenantId: r.tenant_id as string | null,
        userId: r.user_id as string | null,
        userEmail: r.user_email as string | null,
        action: r.action as string,
        resourceType: r.resource_type as string | null,
        resourceId: r.resource_id as string | null,
        details: r.details as Record<string, unknown> | null,
        ipAddress: r.ip_address as string | null,
        userAgent: r.user_agent as string | null,
        createdAt: (r.created_at as Date).toISOString(),
      })),
      total: countRows[0]?.total ?? 0,
    };
  }
}
