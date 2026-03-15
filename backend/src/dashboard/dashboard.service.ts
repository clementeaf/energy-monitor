import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface DashboardBuildingMonth {
  buildingName: string;
  month: string;
  totalKwh: number | null;
  totalConIvaClp: number | null;
  totalMeters: number;
  areaSqm: number | null;
}

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getSummary(): Promise<DashboardBuildingMonth[]> {
    const rows = await this.dataSource.query(`
      SELECT
        bs.building_name  AS "buildingName",
        bs.month          AS "month",
        bs.total_kwh      AS "totalKwh",
        bill.total_clp    AS "totalConIvaClp",
        bs.total_meters   AS "totalMeters",
        bs.area_sqm       AS "areaSqm"
      FROM building_summary bs
      LEFT JOIN (
        SELECT building_name,
               month,
               SUM(total_con_iva_clp) AS total_clp
        FROM meter_monthly_billing
        GROUP BY building_name, month
      ) bill
        ON bill.building_name = bs.building_name
        AND bill.month = CASE
          WHEN bs.month >= '2026-01-01' THEN (bs.month - INTERVAL '1 year')::date
          ELSE bs.month
        END
      ORDER BY bs.building_name, bs.month DESC
    `);

    return rows.map((r: Record<string, unknown>) => ({
      buildingName: r.buildingName as string,
      month: r.month as string,
      totalKwh: r.totalKwh !== null ? parseFloat(String(r.totalKwh)) : null,
      totalConIvaClp: r.totalConIvaClp !== null ? parseFloat(String(r.totalConIvaClp)) : null,
      totalMeters: parseInt(String(r.totalMeters), 10),
      areaSqm: r.areaSqm !== null ? parseFloat(String(r.areaSqm)) : null,
    }));
  }
}
