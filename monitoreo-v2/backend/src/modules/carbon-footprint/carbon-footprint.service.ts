import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface DateRangeDto {
  from: string;
  to: string;
}

interface MonthlyQueryDto extends DateRangeDto {
  buildingId?: string;
}

export interface BuildingEmission {
  buildingId: string;
  buildingName: string;
  totalKwh: number;
  tonsCo2e: number;
}

export interface TenantEmissionSummary {
  totalKwh: number;
  tonsCo2e: number;
  factorUsed: number;
}

export interface MonthlyEmission {
  month: string;
  totalKwh: number;
  tonsCo2e: number;
}

@Injectable()
export class CarbonFootprintService {
  constructor(private readonly dataSource: DataSource) {}

  static kwhToTonsCo2(kwh: number, factorTco2ePerMwh: number): number {
    return (kwh / 1000) * factorTco2ePerMwh;
  }

  async getEmissionFactor(countryCode: string, year: number): Promise<number | null> {
    const exact = await this.dataSource.query(
      `SELECT factor_tco2e_per_mwh FROM emission_factors
       WHERE country_code = $1 AND year = $2`,
      [countryCode, year],
    );

    if (exact.length > 0) {
      return parseFloat(exact[0].factor_tco2e_per_mwh);
    }

    const fallback = await this.dataSource.query(
      `SELECT factor_tco2e_per_mwh FROM emission_factors
       WHERE country_code = $1
       ORDER BY year DESC LIMIT 1`,
      [countryCode],
    );

    return fallback.length > 0 ? parseFloat(fallback[0].factor_tco2e_per_mwh) : null;
  }

  async getByBuilding(
    tenantId: string,
    buildingIds: string[],
    query: DateRangeDto,
  ): Promise<BuildingEmission[]> {
    const factor = await this.resolveChileFactor();

    const rows = await this.dataSource.query(
      `SELECT b.id AS building_id, b.name AS building_name, b.country_code,
              COALESCE(SUM(r.energy_kwh_total), 0) AS total_kwh
       FROM readings r
       JOIN meters m ON m.id = r.meter_id
       JOIN buildings b ON b.id = m.building_id
       WHERE r.tenant_id = $1
         AND m.building_id = ANY($2)
         AND r.timestamp >= $3
         AND r.timestamp < $4
       GROUP BY b.id, b.name, b.country_code`,
      [tenantId, buildingIds, query.from, query.to],
    );

    return rows.map((row: any) => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      totalKwh: parseFloat(row.total_kwh),
      tonsCo2e: CarbonFootprintService.kwhToTonsCo2(parseFloat(row.total_kwh), factor),
    }));
  }

  async getTenantSummary(
    tenantId: string,
    buildingIds: string[],
    query: DateRangeDto,
  ): Promise<TenantEmissionSummary> {
    const factor = await this.resolveChileFactor();

    const rows = await this.dataSource.query(
      `SELECT COALESCE(SUM(r.energy_kwh_total), 0) AS total_kwh
       FROM readings r
       JOIN meters m ON m.id = r.meter_id
       WHERE r.tenant_id = $1
         AND m.building_id = ANY($2)
         AND r.timestamp >= $3
         AND r.timestamp < $4`,
      [tenantId, buildingIds, query.from, query.to],
    );

    const totalKwh = parseFloat(rows[0]?.total_kwh ?? '0');

    return {
      totalKwh,
      tonsCo2e: CarbonFootprintService.kwhToTonsCo2(totalKwh, factor),
      factorUsed: factor,
    };
  }

  async getMonthlyBreakdown(
    tenantId: string,
    buildingIds: string[],
    query: MonthlyQueryDto,
  ): Promise<MonthlyEmission[]> {
    const factor = await this.resolveChileFactor();

    const params: any[] = [tenantId, buildingIds, query.from, query.to];
    let buildingFilter = '';
    if (query.buildingId) {
      buildingFilter = 'AND m.building_id = $5';
      params.push(query.buildingId);
    }

    const rows = await this.dataSource.query(
      `SELECT to_char(date_trunc('month', r.timestamp), 'YYYY-MM') AS month,
              COALESCE(SUM(r.energy_kwh_total), 0) AS total_kwh
       FROM readings r
       JOIN meters m ON m.id = r.meter_id
       WHERE r.tenant_id = $1
         AND m.building_id = ANY($2)
         AND r.timestamp >= $3
         AND r.timestamp < $4
         ${buildingFilter}
       GROUP BY date_trunc('month', r.timestamp)
       ORDER BY month`,
      params,
    );

    return rows.map((row: any) => ({
      month: row.month,
      totalKwh: parseFloat(row.total_kwh),
      tonsCo2e: CarbonFootprintService.kwhToTonsCo2(parseFloat(row.total_kwh), factor),
    }));
  }

  private async resolveChileFactor(): Promise<number> {
    const currentYear = new Date().getFullYear();
    const factor = await this.getEmissionFactor('CL', currentYear);
    // ponytail: default to Chile 2024 factor if DB empty
    return factor ?? 0.3867;
  }
}
