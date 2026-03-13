import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { AccessScope } from '../auth/access-scope';
import { getScopedSiteIds } from '../auth/access-scope';

@Injectable()
export class BillingService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Resuelve center_name permitidos para el scope. Si tiene siteIds, mapea vía staging_centers o buildings; si no, null = todos.
   */
  private async getAllowedCenterNames(scope: AccessScope): Promise<string[] | null> {
    const siteIds = getScopedSiteIds(scope);
    if (!siteIds || siteIds.length === 0) return null;

    try {
      const rows = await this.dataSource.query<Array<{ center_name: string }>>(
        `SELECT center_name FROM staging_centers WHERE id = ANY($1)`,
        [siteIds],
      );
      if (rows.length > 0) return rows.map((r) => r.center_name);
    } catch {
      // staging_centers puede no existir
    }

    try {
      const rows = await this.dataSource.query<Array<{ name: string }>>(
        `SELECT name FROM buildings WHERE id = ANY($1)`,
        [siteIds],
      );
      if (rows.length > 0) return rows.map((r) => r.name);
    } catch {
      // fallback
    }
    return [];
  }

  /**
   * Resumen ejecutivo por centro y mes. Filtros opcionales: year, centerName. Respeta scope por siteIds.
   */
  async findCenterSummaries(
    scope: AccessScope,
    year?: number,
    centerName?: string,
  ): Promise<Array<Record<string, unknown>>> {
    const allowed = await this.getAllowedCenterNames(scope);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (allowed !== null) {
      conditions.push(`center_name = ANY($${p})`);
      params.push(allowed);
      p++;
    }
    if (year != null && Number.isFinite(year)) {
      conditions.push(`year = $${p}`);
      params.push(year);
      p++;
    }
    if (centerName) {
      conditions.push(`center_name = $${p}`);
      params.push(centerName);
      p++;
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, center_name AS "centerName", year, month,
              total_consumption_kwh AS "totalConsumptionKwh", peak_max_kw AS "peakMaxKw",
              demand_punta_kwh AS "demandPuntaKwh", pct_punta AS "pctPunta",
              avg_daily_kwh AS "avgDailyKwh", top_consumer_local AS "topConsumerLocal"
       FROM billing_center_summary ${where} ORDER BY center_name, year, month`,
      params,
    );
    return rows.map((r) => ({
      ...r,
      id: Number(r.id),
      year: Number(r.year),
      month: Number(r.month),
    }));
  }

  /**
   * Detalle mensual por centro, mes y medidor. Filtros: year, month, centerName; limit y offset para paginación.
   */
  async findMonthlyDetails(
    scope: AccessScope,
    year?: number,
    month?: number,
    centerName?: string,
    limit = 100,
    offset = 0,
  ): Promise<Array<Record<string, unknown>>> {
    const allowed = await this.getAllowedCenterNames(scope);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (allowed !== null) {
      conditions.push(`center_name = ANY($${p})`);
      params.push(allowed);
      p++;
    }
    if (year != null && Number.isFinite(year)) {
      conditions.push(`year = $${p}`);
      params.push(year);
      p++;
    }
    if (month != null && month >= 1 && month <= 12) {
      conditions.push(`month = $${p}`);
      params.push(month);
      p++;
    }
    if (centerName) {
      conditions.push(`center_name = $${p}`);
      params.push(centerName);
      p++;
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeLimit = Math.min(Math.max(1, Number(limit) || 100), 500);
    const safeOffset = Math.max(0, Number(offset) || 0);
    params.push(safeLimit, safeOffset);
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, center_name AS "centerName", year, month, meter_id AS "meterId",
              store_type AS "storeType", store_name AS "storeName", phase,
              consumption_kwh AS "consumptionKwh", peak_kw AS "peakKw",
              demand_punta_kwh AS "demandPuntaKwh", pct_punta AS "pctPunta",
              avg_daily_kwh AS "avgDailyKwh", energy_charge_clp AS "energyChargeClp",
              demand_max_kw AS "demandMaxKw", demand_punta_kw AS "demandPuntaKw",
              fixed_charge_clp AS "fixedChargeClp", total_net_clp AS "totalNetClp",
              iva_clp AS "ivaClp", total_with_iva_clp AS "totalWithIvaClp"
       FROM billing_monthly_detail ${where} ORDER BY center_name, year, month, meter_id LIMIT $${p} OFFSET $${p + 1}`,
      params,
    );
    return rows.map((r) => ({
      ...r,
      id: Number(r.id),
      year: Number(r.year),
      month: Number(r.month),
    }));
  }

  /**
   * Pliegos tarifarios por comuna y mes. Filtro opcional: year.
   */
  async findTariffs(scope: AccessScope, year?: number): Promise<Array<Record<string, unknown>>> {
    const params: unknown[] = [];
    const where = year != null && Number.isFinite(year) ? 'WHERE year = $1' : '';
    if (year != null) params.push(year);
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `SELECT id, tariff_name AS "tariffName", year, month,
              consumption_energy_kwh AS "consumptionEnergyKwh", demand_max_kw AS "demandMaxKw",
              demand_punta_kw AS "demandPuntaKw", kwh_troncal AS "kwhTroncal",
              kwh_serv_iva_1 AS "kwhServIva1", kwh_serv_iva_2 AS "kwhServIva2",
              kwh_serv_iva_3 AS "kwhServIva3", kwh_serv_iva_4 AS "kwhServIva4", kwh_serv_iva_5 AS "kwhServIva5",
              fixed_charge_clp AS "fixedChargeClp"
       FROM billing_tariffs ${where} ORDER BY tariff_name, year, month`,
      params,
    );
    return rows.map((r) => ({
      ...r,
      id: Number(r.id),
      year: Number(r.year),
      month: Number(r.month),
    }));
  }

  /**
   * Lista de centros con datos de facturación (distinct center_name) para filtros. Respeta scope.
   */
  async findCenters(scope: AccessScope): Promise<Array<{ centerName: string }>> {
    const allowed = await this.getAllowedCenterNames(scope);
    if (allowed !== null && allowed.length === 0) return [];
    const where = allowed !== null ? 'WHERE center_name = ANY($1)' : '';
    const params = allowed !== null ? [allowed] : [];
    const rows = await this.dataSource.query<Array<{ center_name: string }>>(
      `SELECT DISTINCT center_name FROM billing_monthly_detail ${where} ORDER BY center_name`,
      params,
    );
    return rows.map((r) => ({ centerName: r.center_name }));
  }
}
