import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ComparisonRow {
  buildingName: string;
  totalKwh: number | null;
  totalConIvaClp: number | null;
  totalMeters: number;
  ddaMaxKw: number | null;
  ddaMaxPuntaKw: number | null;
  kwhTroncal: number | null;
  kwhServPublico: number | null;
  energiaClp: number | null;
}

export interface ComparisonStoreRow {
  storeName: string;
  buildingName: string;
  totalKwh: number | null;
  totalConIvaClp: number | null;
  totalMeters: number;
  ddaMaxKw: number | null;
  ddaMaxPuntaKw: number | null;
  kwhTroncal: number | null;
  kwhServPublico: number | null;
  energiaClp: number | null;
}

export interface ComparisonFilters {
  storeTypes: { id: number; name: string }[];
  storeNames: string[];
  buildingNames: string[];
  months: string[];
}

@Injectable()
export class ComparisonsService {
  constructor(private readonly dataSource: DataSource) {}

  async getByStoreType(storeTypeIds: number[], month: string): Promise<ComparisonRow[]> {
    if (storeTypeIds.length === 0) return [];
    const rows = await this.dataSource.query(
      `SELECT
         mmb.building_name              AS "buildingName",
         SUM(mmb.total_kwh)             AS "totalKwh",
         SUM(mmb.total_con_iva_clp)     AS "totalConIvaClp",
         COUNT(DISTINCT s.meter_id)     AS "totalMeters",
         SUM(mmb.dda_max_kw)            AS "ddaMaxKw",
         SUM(mmb.dda_max_punta_kw)      AS "ddaMaxPuntaKw",
         SUM(mmb.kwh_troncal)           AS "kwhTroncal",
         SUM(mmb.kwh_serv_publico)      AS "kwhServPublico",
         SUM(mmb.energia_clp)           AS "energiaClp"
       FROM store s
       JOIN meter_monthly_billing mmb ON s.meter_id = mmb.meter_id
       WHERE s.store_type_id = ANY($1) AND mmb.month = $2
       GROUP BY mmb.building_name
       ORDER BY mmb.building_name`,
      [storeTypeIds, month],
    );

    return rows.map((r: Record<string, unknown>) => this.parseRow(r));
  }

  async getByStoreName(storeNames: string[], month: string): Promise<ComparisonRow[]> {
    if (storeNames.length === 0) return [];
    const rows = await this.dataSource.query(
      `SELECT
         mmb.building_name              AS "buildingName",
         SUM(mmb.total_kwh)             AS "totalKwh",
         SUM(mmb.total_con_iva_clp)     AS "totalConIvaClp",
         COUNT(DISTINCT s.meter_id)     AS "totalMeters",
         SUM(mmb.dda_max_kw)            AS "ddaMaxKw",
         SUM(mmb.dda_max_punta_kw)      AS "ddaMaxPuntaKw",
         SUM(mmb.kwh_troncal)           AS "kwhTroncal",
         SUM(mmb.kwh_serv_publico)      AS "kwhServPublico",
         SUM(mmb.energia_clp)           AS "energiaClp"
       FROM store s
       JOIN meter_monthly_billing mmb ON s.meter_id = mmb.meter_id
       WHERE s.store_name = ANY($1) AND mmb.month = $2
       GROUP BY mmb.building_name
       ORDER BY mmb.building_name`,
      [storeNames, month],
    );

    return rows.map((r: Record<string, unknown>) => this.parseRow(r));
  }

  async getByStore(
    month: string,
    buildingNames?: string[],
    storeTypeIds?: number[],
  ): Promise<ComparisonStoreRow[]> {
    const conditions = ['mmb.month = $1'];
    const params: unknown[] = [month];
    let idx = 2;

    if (buildingNames && buildingNames.length > 0) {
      conditions.push(`mmb.building_name = ANY($${idx})`);
      params.push(buildingNames);
      idx++;
    }
    if (storeTypeIds && storeTypeIds.length > 0) {
      conditions.push(`s.store_type_id = ANY($${idx})`);
      params.push(storeTypeIds);
    }

    const where = conditions.join(' AND ');
    const rows = await this.dataSource.query(
      `SELECT
         s.store_name                    AS "storeName",
         mmb.building_name              AS "buildingName",
         SUM(mmb.total_kwh)             AS "totalKwh",
         SUM(mmb.total_con_iva_clp)     AS "totalConIvaClp",
         COUNT(DISTINCT s.meter_id)     AS "totalMeters",
         SUM(mmb.dda_max_kw)            AS "ddaMaxKw",
         SUM(mmb.dda_max_punta_kw)      AS "ddaMaxPuntaKw",
         SUM(mmb.kwh_troncal)           AS "kwhTroncal",
         SUM(mmb.kwh_serv_publico)      AS "kwhServPublico",
         SUM(mmb.energia_clp)           AS "energiaClp"
       FROM store s
       JOIN meter_monthly_billing mmb ON s.meter_id = mmb.meter_id
       WHERE ${where}
       GROUP BY s.store_name, mmb.building_name
       ORDER BY s.store_name`,
      params,
    );

    return rows.map((r: Record<string, unknown>) => ({
      ...this.parseRow(r),
      storeName: r.storeName as string,
    }));
  }

  private parseRow(r: Record<string, unknown>): ComparisonRow {
    const num = (v: unknown) => (v !== null && v !== undefined ? parseFloat(String(v)) : null);
    return {
      buildingName: r.buildingName as string,
      totalKwh: num(r.totalKwh),
      totalConIvaClp: num(r.totalConIvaClp),
      totalMeters: parseInt(String(r.totalMeters), 10),
      ddaMaxKw: num(r.ddaMaxKw),
      ddaMaxPuntaKw: num(r.ddaMaxPuntaKw),
      kwhTroncal: num(r.kwhTroncal),
      kwhServPublico: num(r.kwhServPublico),
      energiaClp: num(r.energiaClp),
    };
  }

  async getFilters(): Promise<ComparisonFilters> {
    const [storeTypes, storeNames, buildingNames, months] = await Promise.all([
      this.dataSource.query(
        `SELECT id, name FROM store_type ORDER BY name`,
      ),
      this.dataSource.query(
        `SELECT DISTINCT store_name FROM store WHERE store_name IS NOT NULL ORDER BY store_name`,
      ),
      this.dataSource.query(
        `SELECT DISTINCT building_name FROM meter_monthly_billing ORDER BY building_name`,
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
      buildingNames: buildingNames.map((r: Record<string, unknown>) => r.building_name as string),
      months: months.map((r: Record<string, unknown>) => String(r.month)),
    };
  }
}
