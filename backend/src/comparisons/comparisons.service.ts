import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ComparisonRow {
  buildingName: string;
  totalKwh: number | null;
  totalConIvaClp: number | null;
  totalMeters: number;
}

export interface ComparisonFilters {
  storeTypes: { id: number; name: string }[];
  storeNames: string[];
  months: string[];
}

@Injectable()
export class ComparisonsService {
  constructor(private readonly dataSource: DataSource) {}

  async getByStoreType(storeTypeIds: number[], month: string): Promise<ComparisonRow[]> {
    if (storeTypeIds.length === 0) return [];
    const rows = await this.dataSource.query(
      `SELECT
         mmb.building_name          AS "buildingName",
         SUM(mmb.total_kwh)         AS "totalKwh",
         SUM(mmb.total_con_iva_clp) AS "totalConIvaClp",
         COUNT(DISTINCT s.meter_id) AS "totalMeters"
       FROM store s
       JOIN meter_monthly_billing mmb ON s.meter_id = mmb.meter_id
       WHERE s.store_type_id = ANY($1) AND mmb.month = $2
       GROUP BY mmb.building_name
       ORDER BY mmb.building_name`,
      [storeTypeIds, month],
    );

    return rows.map((r: Record<string, unknown>) => ({
      buildingName: r.buildingName as string,
      totalKwh: r.totalKwh !== null ? parseFloat(String(r.totalKwh)) : null,
      totalConIvaClp: r.totalConIvaClp !== null ? parseFloat(String(r.totalConIvaClp)) : null,
      totalMeters: parseInt(String(r.totalMeters), 10),
    }));
  }

  async getByStoreName(storeNames: string[], month: string): Promise<ComparisonRow[]> {
    if (storeNames.length === 0) return [];
    const rows = await this.dataSource.query(
      `SELECT
         mmb.building_name          AS "buildingName",
         SUM(mmb.total_kwh)         AS "totalKwh",
         SUM(mmb.total_con_iva_clp) AS "totalConIvaClp",
         COUNT(DISTINCT s.meter_id) AS "totalMeters"
       FROM store s
       JOIN meter_monthly_billing mmb ON s.meter_id = mmb.meter_id
       WHERE s.store_name = ANY($1) AND mmb.month = $2
       GROUP BY mmb.building_name
       ORDER BY mmb.building_name`,
      [storeNames, month],
    );

    return rows.map((r: Record<string, unknown>) => ({
      buildingName: r.buildingName as string,
      totalKwh: r.totalKwh !== null ? parseFloat(String(r.totalKwh)) : null,
      totalConIvaClp: r.totalConIvaClp !== null ? parseFloat(String(r.totalConIvaClp)) : null,
      totalMeters: parseInt(String(r.totalMeters), 10),
    }));
  }

  async getFilters(): Promise<ComparisonFilters> {
    const [storeTypes, storeNames, months] = await Promise.all([
      this.dataSource.query(
        `SELECT id, name FROM store_type ORDER BY name`,
      ),
      this.dataSource.query(
        `SELECT DISTINCT store_name FROM store WHERE store_name IS NOT NULL ORDER BY store_name`,
      ),
      this.dataSource.query(
        `SELECT DISTINCT month::text FROM meter_monthly_billing ORDER BY month`,
      ),
    ]);

    return {
      storeTypes: storeTypes.map((r: Record<string, unknown>) => ({
        id: Number(r.id),
        name: r.name as string,
      })),
      storeNames: storeNames.map((r: Record<string, unknown>) => r.store_name as string),
      months: months.map((r: Record<string, unknown>) => String(r.month)),
    };
  }
}
