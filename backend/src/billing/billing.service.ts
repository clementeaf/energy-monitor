import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export interface BillingMonthlySummary {
  month: string;
  totalMeters: number;
  totalKwh: number;
  energiaClp: number;
  ddaMaxKw: number;
  ddaMaxPuntaKw: number;
  kwhTroncal: number;
  kwhServPublico: number;
  cargoFijoClp: number;
  totalNetoClp: number;
  ivaClp: number;
  montoExentoClp: number;
  totalConIvaClp: number;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly lambda = new LambdaClient({ region: 'us-east-1' });

  constructor(private readonly dataSource: DataSource) {}

  async findByBuilding(buildingName: string): Promise<BillingMonthlySummary[]> {
    const rows = await this.dataSource.query(
      `SELECT
         month,
         COUNT(*)::int                              AS "totalMeters",
         ROUND(SUM(total_kwh)::numeric, 2)          AS "totalKwh",
         ROUND(SUM(energia_clp)::numeric, 0)        AS "energiaClp",
         ROUND(MAX(dda_max_kw)::numeric, 2)         AS "ddaMaxKw",
         ROUND(MAX(dda_max_punta_kw)::numeric, 2)   AS "ddaMaxPuntaKw",
         ROUND(SUM(kwh_troncal)::numeric, 2)        AS "kwhTroncal",
         ROUND(SUM(kwh_serv_publico)::numeric, 2)   AS "kwhServPublico",
         ROUND(SUM(cargo_fijo_clp)::numeric, 0)     AS "cargoFijoClp",
         ROUND(SUM(total_neto_clp)::numeric, 0)     AS "totalNetoClp",
         ROUND(SUM(iva_clp)::numeric, 0)            AS "ivaClp",
         ROUND(SUM(monto_exento_clp)::numeric, 0)   AS "montoExentoClp",
         ROUND(SUM(total_con_iva_clp)::numeric, 0)  AS "totalConIvaClp"
       FROM meter_monthly_billing
       WHERE building_name = $1
       GROUP BY month
       ORDER BY month`,
      [buildingName],
    );

    return rows.map((r: Record<string, string>) => ({
      month: r.month,
      totalMeters: parseInt(r.totalMeters),
      totalKwh: parseFloat(r.totalKwh),
      energiaClp: parseFloat(r.energiaClp),
      ddaMaxKw: parseFloat(r.ddaMaxKw),
      ddaMaxPuntaKw: parseFloat(r.ddaMaxPuntaKw),
      kwhTroncal: parseFloat(r.kwhTroncal),
      kwhServPublico: parseFloat(r.kwhServPublico),
      cargoFijoClp: parseFloat(r.cargoFijoClp),
      totalNetoClp: parseFloat(r.totalNetoClp),
      ivaClp: parseFloat(r.ivaClp),
      montoExentoClp: parseFloat(r.montoExentoClp),
      totalConIvaClp: parseFloat(r.totalConIvaClp),
    }));
  }

  async generatePdf(
    storeName: string,
    buildingName: string,
    month: string,
  ): Promise<{ pdf: Buffer; filename: string }> {
    const payload = JSON.stringify({ storeName, buildingName, month });

    const command = new InvokeCommand({
      FunctionName: 'billing-pdf-generator',
      Payload: new TextEncoder().encode(payload),
    });

    const result = await this.lambda.send(command);
    const responseStr = new TextDecoder().decode(result.Payload);
    const response = JSON.parse(responseStr);

    if (result.FunctionError || response.statusCode !== 200) {
      const body = response.body ? JSON.parse(response.body) : response;
      const errorMsg = body.error || 'PDF generation failed';
      this.logger.error(`PDF Lambda error: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const body = JSON.parse(response.body);
    return {
      pdf: Buffer.from(body.pdf, 'base64'),
      filename: body.filename,
    };
  }
}
