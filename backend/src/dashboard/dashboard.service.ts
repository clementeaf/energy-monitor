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

export interface OverdueBucket {
  range: string;
  count: number;
  totalClp: number;
}

export interface PaymentSummary {
  pagosRecibidos: { count: number; totalClp: number };
  porVencer: { count: number; totalClp: number };
  vencidos: { count: number; totalClp: number };
  vencidosPorPeriodo: OverdueBucket[];
}

export interface BillingDocumentDetail {
  id: number;
  buildingName: string;
  month: string;
  docNumber: string;
  dueDate: string;
  totalNetoClp: number | null;
  ivaClp: number | null;
  totalClp: number;
  meterCount: number;
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

  async getPaymentSummary(): Promise<PaymentSummary> {
    const [statusRows] = await Promise.all([
      this.dataSource.query(`
        SELECT status,
               COUNT(*)::int AS count,
               COALESCE(SUM(total_clp), 0)::numeric AS "totalClp"
        FROM billing_document
        GROUP BY status
      `),
    ]);

    const byStatus: Record<string, { count: number; totalClp: number }> = {};
    for (const r of statusRows) {
      byStatus[r.status] = { count: r.count, totalClp: parseFloat(r.totalClp) };
    }

    const bucketRows = await this.dataSource.query(`
      SELECT
        CASE
          WHEN days_overdue BETWEEN 1 AND 30 THEN '1-30 días'
          WHEN days_overdue BETWEEN 31 AND 60 THEN '31-60 días'
          WHEN days_overdue BETWEEN 61 AND 90 THEN '61-90 días'
          WHEN days_overdue > 90 THEN '90+ días'
        END AS range,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_clp), 0)::numeric AS "totalClp"
      FROM billing_document
      WHERE status = 'vencido'
      GROUP BY 1
      ORDER BY MIN(days_overdue)
    `);

    const allBuckets = ['1-30 días', '31-60 días', '61-90 días', '90+ días'];
    const bucketMap = new Map<string, { range: string; count: number; totalClp: string }>(
      bucketRows.map((r: { range: string; count: number; totalClp: string }) => [r.range, r]),
    );
    const vencidosPorPeriodo: OverdueBucket[] = allBuckets.map((range) => {
      const r = bucketMap.get(range);
      return {
        range,
        count: r ? r.count : 0,
        totalClp: r ? parseFloat(String(r.totalClp)) : 0,
      };
    });

    return {
      pagosRecibidos: byStatus['pagado'] ?? { count: 0, totalClp: 0 },
      porVencer: byStatus['por_vencer'] ?? { count: 0, totalClp: 0 },
      vencidos: byStatus['vencido'] ?? { count: 0, totalClp: 0 },
      vencidosPorPeriodo,
    };
  }

  async getDocumentsByStatus(status: string): Promise<BillingDocumentDetail[]> {
    const rows = await this.dataSource.query(
      `SELECT
         id,
         building_name   AS "buildingName",
         month,
         doc_number      AS "docNumber",
         due_date        AS "dueDate",
         total_neto_clp  AS "totalNetoClp",
         iva_clp         AS "ivaClp",
         total_clp       AS "totalClp",
         meter_count     AS "meterCount"
       FROM billing_document
       WHERE status = $1
       ORDER BY due_date`,
      [status],
    );

    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      buildingName: r.buildingName as string,
      month: r.month as string,
      docNumber: r.docNumber as string,
      dueDate: r.dueDate as string,
      totalNetoClp: r.totalNetoClp !== null ? parseFloat(String(r.totalNetoClp)) : null,
      ivaClp: r.ivaClp !== null ? parseFloat(String(r.ivaClp)) : null,
      totalClp: parseFloat(String(r.totalClp)),
      meterCount: parseInt(String(r.meterCount), 10),
    }));
  }
}
