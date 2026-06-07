import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataQualityDaily } from '../platform/entities/data-quality-daily.entity';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

export interface DataQualityReportRow {
  buildingId: string;
  day: string;
  measuredPct: number;
  estimatedPct: number;
  invalidPct: number;
  unknownPct: number;
  total: number;
}

export interface DataQualityReportResponse {
  tenantId: string;
  from: string;
  to: string;
  rows: DataQualityReportRow[];
  summary: {
    avgMeasuredPct: number;
    avgInvalidPct: number;
    totalReadings: number;
  };
}

/**
 * Admin report over data_quality_daily aggregates (GAP-164).
 */
@Injectable()
export class DataQualityReportService {
  constructor(
    @InjectRepository(DataQualityDaily)
    private readonly qualityRepo: Repository<DataQualityDaily>,
  ) {}

  /**
   * Returns quality report for tenant and date range.
   */
  async getReport(
    user: JwtPayload,
    tenantId: string | undefined,
    from: string,
    to: string,
  ): Promise<DataQualityReportResponse> {
    const scopeTenantId = this.resolveTenantId(user, tenantId);

    const rows = await this.qualityRepo
      .createQueryBuilder('q')
      .where('q.tenant_id = :tenantId', { tenantId: scopeTenantId })
      .andWhere('q.day >= :from', { from })
      .andWhere('q.day <= :to', { to })
      .orderBy('q.day', 'ASC')
      .addOrderBy('q.building_id', 'ASC')
      .getMany();

    const mapped = rows.map((row) => ({
      buildingId: row.buildingId,
      day: row.day,
      measuredPct: Number(row.measuredPct),
      estimatedPct: Number(row.estimatedPct),
      invalidPct: Number(row.invalidPct),
      unknownPct: Number(row.unknownPct),
      total: Number(row.total),
    }));

    const totalReadings = mapped.reduce((sum, r) => sum + r.total, 0);
    const avgMeasuredPct =
      mapped.length > 0
        ? mapped.reduce((sum, r) => sum + r.measuredPct, 0) / mapped.length
        : 0;
    const avgInvalidPct =
      mapped.length > 0
        ? mapped.reduce((sum, r) => sum + r.invalidPct, 0) / mapped.length
        : 0;

    return {
      tenantId: scopeTenantId,
      from,
      to,
      rows: mapped,
      summary: {
        avgMeasuredPct: Math.round(avgMeasuredPct * 100) / 100,
        avgInvalidPct: Math.round(avgInvalidPct * 100) / 100,
        totalReadings,
      },
    };
  }

  /**
   * Resolves tenant scope for cross-tenant admin queries.
   */
  private resolveTenantId(user: JwtPayload, requestedTenantId?: string): string {
    if (user.crossTenant) {
      if (!requestedTenantId) {
        throw new BadRequestException('tenantId query param required for cross-tenant report');
      }
      return requestedTenantId;
    }
    return user.tenantId;
  }
}
