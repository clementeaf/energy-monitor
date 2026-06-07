import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DataContract } from '../platform/entities/data-contract.entity';
import { DataSloBreach } from '../platform/entities/data-slo-breach.entity';

export interface BalanceAnomalyRow {
  id: string;
  parentMeterId: string;
  parentMeterName: string | null;
  parentMeterCode: string | null;
  day: string;
  sumChildren: string;
  parentKwh: string;
  delta: string;
  deltaPct: string | null;
  detectedAt: string;
}

/**
 * Admin read-only queries for data governance tables.
 */
@Injectable()
export class DataGovernanceAdminService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DataContract)
    private readonly contractRepo: Repository<DataContract>,
    @InjectRepository(DataSloBreach)
    private readonly sloRepo: Repository<DataSloBreach>,
  ) {}

  /**
   * Lists balance anomalies for a tenant within an optional date range.
   */
  async listBalanceAnomalies(
    tenantId: string,
    from?: string,
    to?: string,
    limit = 100,
  ): Promise<BalanceAnomalyRow[]> {
    const params: unknown[] = [tenantId];
    let sql = `
      SELECT ba.id, ba.parent_meter_id, m.name AS parent_meter_name, m.code AS parent_meter_code,
             ba.day::text, ba.sum_children::text, ba.parent_kwh::text, ba.delta::text,
             ba.delta_pct::text, ba.detected_at
      FROM balance_anomalies ba
      JOIN meters m ON m.id = ba.parent_meter_id
      WHERE ba.tenant_id = $1`;

    if (from) {
      params.push(from);
      sql += ` AND ba.day >= $${params.length}::date`;
    }
    if (to) {
      params.push(to);
      sql += ` AND ba.day <= $${params.length}::date`;
    }

    params.push(Math.min(Math.max(limit, 1), 500));
    sql += ` ORDER BY ba.day DESC, ba.detected_at DESC LIMIT $${params.length}`;

    const rows = await this.dataSource.query(sql, params);
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      parentMeterId: String(r.parent_meter_id),
      parentMeterName: r.parent_meter_name != null ? String(r.parent_meter_name) : null,
      parentMeterCode: r.parent_meter_code != null ? String(r.parent_meter_code) : null,
      day: String(r.day),
      sumChildren: String(r.sum_children),
      parentKwh: String(r.parent_kwh),
      delta: String(r.delta),
      deltaPct: r.delta_pct != null ? String(r.delta_pct) : null,
      detectedAt: new Date(String(r.detected_at)).toISOString(),
    }));
  }

  /**
   * Lists recent SLO breaches for a tenant.
   */
  async listSloBreaches(tenantId: string, limit = 50): Promise<DataSloBreach[]> {
    const take = Math.min(Math.max(limit, 1), 200);
    return this.sloRepo.find({
      where: { tenantId },
      order: { breachedAt: 'DESC' },
      take,
    });
  }

  /**
   * Lists active data contracts (tenant-specific and global).
   */
  async listDataContracts(tenantId: string): Promise<DataContract[]> {
    return this.contractRepo
      .createQueryBuilder('c')
      .where('c.tenant_id IS NULL OR c.tenant_id = :tenantId', { tenantId })
      .orderBy('c.effective_from', 'DESC')
      .getMany();
  }
}
