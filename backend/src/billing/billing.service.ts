import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

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

  async findByBuildingAndMonth(buildingName: string, month: string) {
    const rows = await this.dataSource.query(
      `SELECT
         s.store_name                                   AS "storeName",
         ROUND(SUM(m.total_kwh)::numeric, 2)            AS "totalKwh",
         ROUND(SUM(m.energia_clp)::numeric, 0)          AS "energiaClp",
         ROUND(MAX(m.dda_max_kw)::numeric, 2)           AS "ddaMaxKw",
         ROUND(MAX(m.dda_max_punta_kw)::numeric, 2)     AS "ddaMaxPuntaKw",
         ROUND(SUM(m.kwh_troncal)::numeric, 2)          AS "kwhTroncal",
         ROUND(SUM(m.kwh_serv_publico)::numeric, 2)     AS "kwhServPublico",
         ROUND(SUM(m.cargo_fijo_clp)::numeric, 0)       AS "cargoFijoClp",
         ROUND(SUM(m.total_neto_clp)::numeric, 0)       AS "totalNetoClp",
         ROUND(SUM(m.iva_clp)::numeric, 0)              AS "ivaClp",
         ROUND(SUM(m.monto_exento_clp)::numeric, 0)     AS "montoExentoClp",
         ROUND(SUM(m.total_con_iva_clp)::numeric, 0)    AS "totalConIvaClp"
       FROM meter_monthly_billing m
       JOIN store s ON s.meter_id = m.meter_id
       WHERE m.building_name = $1 AND m.month = $2
       GROUP BY s.store_name
       ORDER BY s.store_name`,
      [buildingName, month],
    );

    return rows.map((r: Record<string, string>) => ({
      storeName: r.storeName,
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
    // Normalize month: strip ISO timestamp to YYYY-MM-DD
    const normalizedMonth = month.slice(0, 10);

    if (process.env.NODE_ENV !== 'production') {
      return this.generatePdfLocal(storeName, buildingName, normalizedMonth);
    }
    return this.generatePdfLambda(storeName, buildingName, normalizedMonth);
  }

  private async generatePdfLocal(
    storeName: string,
    buildingName: string,
    month: string,
  ): Promise<{ pdf: Buffer; filename: string }> {
    const handlerPath = path.resolve(__dirname, '../../billing-pdf-lambda/handler.py');
    const script = `
import sys, json
sys.path.insert(0, '${path.dirname(handlerPath).replace(/'/g, "\\'")}')
from handler import handler as lambda_handler
event = json.loads(sys.argv[1])
result = lambda_handler(event, None)
print(json.dumps(result))
`;
    const event = JSON.stringify({ storeName, buildingName, month });

    const { stdout } = await execFileAsync('python3', ['-c', script, event], {
      env: {
        ...process.env,
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: process.env.DB_PORT || '5434',
        DB_NAME: process.env.DB_NAME || 'arauco',
        DB_USERNAME: process.env.DB_USERNAME || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'arauco',
      },
      maxBuffer: 10 * 1024 * 1024,
    });

    const response = JSON.parse(stdout.trim());
    if (response.statusCode !== 200) {
      const body = response.body ? JSON.parse(response.body) : response;
      throw new Error(body.error || 'Local PDF generation failed');
    }

    const body = JSON.parse(response.body);
    return {
      pdf: Buffer.from(body.pdf, 'base64'),
      filename: body.filename,
    };
  }

  private async generatePdfLambda(
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
