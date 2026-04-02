import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CronExpressionParser } from 'cron-parser';
import { Report } from '../platform/entities/report.entity';
import { ScheduledReport } from '../platform/entities/scheduled-report.entity';
import type { PlatformReportType, ReportFormat } from '../platform/entities/report.entity';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { UpdateScheduledReportDto } from './dto/update-scheduled-report.dto';
import {
  datasetToCsvBuffer,
  datasetToExcelBuffer,
  datasetToPdfBuffer,
  exportFilename,
  mimeForFormat,
  type ReportDataset,
} from './report-export';

interface ExportResult {
  buffer: Buffer;
  mime: string;
  filename: string;
}

/**
 * CRUD for reports, generation, scheduled runs, and binary export.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(ScheduledReport)
    private readonly scheduledRepo: Repository<ScheduledReport>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    tenantId: string,
    buildingIds: string[],
    filters?: { buildingId?: string; reportType?: string },
  ): Promise<Report[]> {
    const qb = this.reportRepo
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .orderBy('r.created_at', 'DESC');

    if (buildingIds.length > 0) {
      qb.andWhere('(r.building_id IS NULL OR r.building_id IN (:...buildingIds))', {
        buildingIds,
      });
    }

    if (filters?.buildingId) {
      qb.andWhere('r.building_id = :buildingId', { buildingId: filters.buildingId });
    }

    if (filters?.reportType) {
      qb.andWhere('r.report_type = :reportType', { reportType: filters.reportType });
    }

    return qb.getMany();
  }

  async findOne(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<Report | null> {
    const qb = this.reportRepo
      .createQueryBuilder('r')
      .where('r.id = :id', { id })
      .andWhere('r.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('(r.building_id IS NULL OR r.building_id IN (:...buildingIds))', {
        buildingIds,
      });
    }

    return qb.getOne();
  }

  async remove(id: string, tenantId: string, buildingIds: string[]): Promise<boolean> {
    const row = await this.findOne(id, tenantId, buildingIds);
    if (!row) return false;
    const result = await this.reportRepo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  async generate(
    tenantId: string,
    userId: string,
    dto: GenerateReportDto,
    buildingIds: string[],
  ): Promise<Report> {
    await this.assertBuildingAccess(tenantId, dto.buildingId ?? null, buildingIds);

    const entity = this.reportRepo.create({
      tenantId,
      buildingId: dto.buildingId ?? null,
      reportType: dto.reportType,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      format: dto.format,
      fileUrl: null,
      fileSizeBytes: null,
      generatedBy: userId,
    });
    return this.reportRepo.save(entity);
  }

  /**
   * Builds export bytes for a stored report row.
   * @param id - Report id
   * @param tenantId - Tenant scope
   * @param buildingIds - Building RBAC scope
   * @returns Buffer, MIME type, and filename
   */
  async exportReport(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<ExportResult> {
    const report = await this.findOne(id, tenantId, buildingIds);
    if (!report) throw new NotFoundException('Report not found');

    const dataset = await this.buildDataset(
      tenantId,
      report.reportType,
      report.buildingId,
      buildingIds,
      report.periodStart,
      report.periodEnd,
    );

    const buffer = await this.renderBuffer(dataset, report.format);
    const mime = mimeForFormat(report.format);
    const filename = exportFilename(report.reportType, report.periodStart, report.format);

    await this.reportRepo.update(
      { id },
      { fileSizeBytes: String(buffer.length) },
    );

    return { buffer, mime, filename };
  }

  async findAllScheduled(
    tenantId: string,
    buildingIds: string[],
    filters?: { buildingId?: string; isActive?: boolean },
  ): Promise<ScheduledReport[]> {
    const qb = this.scheduledRepo
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .orderBy('s.created_at', 'DESC');

    if (buildingIds.length > 0) {
      qb.andWhere('(s.building_id IS NULL OR s.building_id IN (:...buildingIds))', {
        buildingIds,
      });
    }

    if (filters?.buildingId) {
      qb.andWhere('s.building_id = :buildingId', { buildingId: filters.buildingId });
    }

    if (filters?.isActive !== undefined) {
      qb.andWhere('s.is_active = :isActive', { isActive: filters.isActive });
    }

    return qb.getMany();
  }

  async findOneScheduled(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<ScheduledReport | null> {
    const qb = this.scheduledRepo
      .createQueryBuilder('s')
      .where('s.id = :id', { id })
      .andWhere('s.tenant_id = :tenantId', { tenantId });

    if (buildingIds.length > 0) {
      qb.andWhere('(s.building_id IS NULL OR s.building_id IN (:...buildingIds))', {
        buildingIds,
      });
    }

    return qb.getOne();
  }

  async createScheduled(
    tenantId: string,
    userId: string,
    dto: CreateScheduledReportDto,
    buildingIds: string[],
  ): Promise<ScheduledReport> {
    await this.assertBuildingAccess(tenantId, dto.buildingId ?? null, buildingIds);
    const nextRunAt = this.computeNextRun(dto.cronExpression);

    const row = this.scheduledRepo.create({
      tenantId,
      buildingId: dto.buildingId ?? null,
      reportType: dto.reportType,
      format: dto.format,
      cronExpression: dto.cronExpression,
      recipients: dto.recipients,
      isActive: dto.isActive ?? true,
      lastRunAt: null,
      nextRunAt,
      createdBy: userId,
    });
    return this.scheduledRepo.save(row);
  }

  async updateScheduled(
    id: string,
    tenantId: string,
    dto: UpdateScheduledReportDto,
    buildingIds: string[],
  ): Promise<ScheduledReport | null> {
    const row = await this.findOneScheduled(id, tenantId, buildingIds);
    if (!row) return null;

    if (dto.buildingId !== undefined) {
      await this.assertBuildingAccess(tenantId, dto.buildingId, buildingIds);
      row.buildingId = dto.buildingId;
    }
    if (dto.reportType !== undefined) row.reportType = dto.reportType;
    if (dto.format !== undefined) row.format = dto.format;
    if (dto.recipients !== undefined) row.recipients = dto.recipients;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;

    if (dto.cronExpression !== undefined) {
      row.cronExpression = dto.cronExpression;
      row.nextRunAt = this.computeNextRun(dto.cronExpression);
    }

    return this.scheduledRepo.save(row);
  }

  async removeScheduled(
    id: string,
    tenantId: string,
    buildingIds: string[],
  ): Promise<boolean> {
    const row = await this.findOneScheduled(id, tenantId, buildingIds);
    if (!row) return false;
    const result = await this.scheduledRepo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Processes scheduled reports that are due (cron worker).
   * @returns Number of schedules executed
   */
  async processDueScheduledReports(): Promise<number> {
    const rows = await this.scheduledRepo
      .createQueryBuilder('s')
      .where('s.is_active = true')
      .andWhere('s.next_run_at IS NOT NULL')
      .andWhere('s.next_run_at <= :now', { now: new Date() })
      .getMany();

    let count = 0;
    for (const schedule of rows) {
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 7);
      const periodStartStr = periodStart.toISOString().slice(0, 10);
      const periodEndStr = periodEnd.toISOString().slice(0, 10);

      const report = this.reportRepo.create({
        tenantId: schedule.tenantId,
        buildingId: schedule.buildingId,
        reportType: schedule.reportType as PlatformReportType,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        format: schedule.format,
        fileUrl: null,
        fileSizeBytes: null,
        generatedBy: schedule.createdBy,
      });
      await this.reportRepo.save(report);

      schedule.lastRunAt = new Date();
      schedule.nextRunAt = this.computeNextRun(schedule.cronExpression, schedule.lastRunAt);
      await this.scheduledRepo.save(schedule);
      count += 1;
    }

    return count;
  }

  private computeNextRun(cronExpression: string, from: Date = new Date()): Date {
    try {
      const expr = CronExpressionParser.parse(cronExpression, { currentDate: from });
      return expr.next().toDate();
    } catch {
      throw new BadRequestException('Invalid cron expression');
    }
  }

  private async assertBuildingAccess(
    tenantId: string,
    buildingId: string | null,
    scopeIds: string[],
  ): Promise<void> {
    if (!buildingId) return;
    if (scopeIds.length > 0 && !scopeIds.includes(buildingId)) {
      throw new ForbiddenException('No access to this building');
    }
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT id FROM buildings WHERE id = $1 AND tenant_id = $2`,
      [buildingId, tenantId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Building not found');
    }
  }

  private async renderBuffer(dataset: ReportDataset, format: ReportFormat): Promise<Buffer> {
    switch (format) {
      case 'pdf':
        return datasetToPdfBuffer(dataset);
      case 'excel':
        return datasetToExcelBuffer(dataset);
      case 'csv':
        return Promise.resolve(datasetToCsvBuffer(dataset));
      default:
        return datasetToPdfBuffer(dataset);
    }
  }

  private async buildDataset(
    tenantId: string,
    reportType: PlatformReportType,
    buildingId: string | null,
    buildingIds: string[],
    periodStart: string,
    periodEnd: string,
  ): Promise<ReportDataset> {
    const scope = buildingIds.length > 0 ? buildingIds : [];
    const subtitle = `Periodo ${periodStart} a ${periodEnd}`;

    switch (reportType) {
      case 'consumption':
        return this.datasetConsumption(tenantId, buildingId, scope, periodStart, periodEnd, subtitle);
      case 'demand':
        return this.datasetDemand(tenantId, buildingId, scope, periodStart, periodEnd, subtitle);
      case 'billing':
        return this.datasetBilling(tenantId, buildingId, scope, periodStart, periodEnd, subtitle);
      case 'executive':
        return this.datasetExecutive(tenantId, buildingId, scope, periodStart, periodEnd, subtitle);
      case 'quality':
        return this.datasetQuality(
          tenantId,
          buildingId,
          scope,
          periodStart,
          periodEnd,
          subtitle,
        );
      case 'alerts_compliance':
        return this.datasetAlerts(tenantId, buildingId, scope, periodStart, periodEnd, subtitle);
      default:
        return this.datasetGeneric(reportType, subtitle);
    }
  }

  private async datasetConsumption(
    tenantId: string,
    buildingId: string | null,
    scope: string[],
    periodStart: string,
    periodEnd: string,
    subtitle: string,
  ): Promise<ReportDataset> {
    const rows: Array<{
      name: string;
      code: string;
      kwh: string;
      kw_max: string;
    }> = await this.dataSource.query(
      `SELECT m.name, m.code,
        COALESCE(SUM(r.power_kw * 0.25), 0)::numeric(14,2)::text AS kwh,
        COALESCE(MAX(r.power_kw), 0)::numeric(14,2)::text AS kw_max
       FROM meters m
       LEFT JOIN readings r ON r.meter_id = m.id
         AND r.tenant_id = m.tenant_id
         AND r.timestamp >= $4::date
         AND r.timestamp < $5::date + INTERVAL '1 day'
       WHERE m.tenant_id = $1
         AND ($2::uuid IS NULL OR m.building_id = $2)
         AND (cardinality($3::uuid[]) = 0 OR m.building_id = ANY($3))
       GROUP BY m.id, m.name, m.code
       ORDER BY m.name`,
      [tenantId, buildingId, scope, periodStart, periodEnd],
    );

    return {
      title: 'Reporte de consumo energético',
      subtitle,
      columns: ['Medidor', 'Código', 'kWh', 'kW máx.'],
      rows: rows.map((r) => [r.name, r.code, r.kwh, r.kw_max]),
    };
  }

  private async datasetDemand(
    tenantId: string,
    buildingId: string | null,
    scope: string[],
    periodStart: string,
    periodEnd: string,
    subtitle: string,
  ): Promise<ReportDataset> {
    const rows: Array<{ name: string; code: string; kw_max: string }> = await this.dataSource.query(
      `SELECT m.name, m.code,
        COALESCE(MAX(r.power_kw), 0)::numeric(14,2)::text AS kw_max
       FROM meters m
       LEFT JOIN readings r ON r.meter_id = m.id
         AND r.tenant_id = m.tenant_id
         AND r.timestamp >= $4::date
         AND r.timestamp < $5::date + INTERVAL '1 day'
       WHERE m.tenant_id = $1
         AND ($2::uuid IS NULL OR m.building_id = $2)
         AND (cardinality($3::uuid[]) = 0 OR m.building_id = ANY($3))
       GROUP BY m.id, m.name, m.code
       ORDER BY m.name`,
      [tenantId, buildingId, scope, periodStart, periodEnd],
    );

    return {
      title: 'Reporte de demanda',
      subtitle,
      columns: ['Medidor', 'Código', 'Demanda máx. (kW)'],
      rows: rows.map((r) => [r.name, r.code, r.kw_max]),
    };
  }

  private async datasetBilling(
    tenantId: string,
    buildingId: string | null,
    scope: string[],
    periodStart: string,
    periodEnd: string,
    subtitle: string,
  ): Promise<ReportDataset> {
    const rows: Array<{
      invoice_number: string;
      period_start: string;
      period_end: string;
      status: string;
      total: string;
    }> = await this.dataSource.query(
      `SELECT i.invoice_number, i.period_start::text, i.period_end::text, i.status, i.total::text
       FROM invoices i
       WHERE i.tenant_id = $1
         AND ($2::uuid IS NULL OR i.building_id = $2)
         AND (cardinality($3::uuid[]) = 0 OR i.building_id = ANY($3))
         AND i.period_end >= $4::date
         AND i.period_start <= $5::date
       ORDER BY i.period_end DESC, i.invoice_number DESC`,
      [tenantId, buildingId, scope, periodStart, periodEnd],
    );

    return {
      title: 'Resumen de facturación',
      subtitle,
      columns: ['N° factura', 'Inicio', 'Fin', 'Estado', 'Total'],
      rows: rows.map((r) => [
        r.invoice_number,
        r.period_start,
        r.period_end,
        r.status,
        r.total,
      ]),
    };
  }

  private async datasetExecutive(
    tenantId: string,
    buildingId: string | null,
    scope: string[],
    periodStart: string,
    periodEnd: string,
    subtitle: string,
  ): Promise<ReportDataset> {
    const kpi: Array<{ label: string; value: string }> = await this.dataSource.query(
      `WITH mscope AS (
         SELECT m.id FROM meters m
         WHERE m.tenant_id = $1
           AND ($2::uuid IS NULL OR m.building_id = $2)
           AND (cardinality($3::uuid[]) = 0 OR m.building_id = ANY($3))
       ),
       bscope AS (
         SELECT b.id, b.name FROM buildings b
         WHERE b.tenant_id = $1
           AND ($2::uuid IS NULL OR b.id = $2)
           AND (cardinality($3::uuid[]) = 0 OR b.id = ANY($3))
       )
       SELECT 'Edificios'::text AS label, COUNT(*)::text AS value FROM bscope
       UNION ALL
       SELECT 'Medidores activos', COUNT(*)::text FROM mscope
       UNION ALL
       SELECT 'Energía kWh (aprox.)',
         COALESCE((
           SELECT SUM(r.power_kw * 0.25)::numeric(16,2)::text
           FROM readings r
           JOIN mscope ms ON ms.id = r.meter_id
           WHERE r.tenant_id = $1
             AND r.timestamp >= $4::date
             AND r.timestamp < $5::date + INTERVAL '1 day'
         ), '0')`,
      [tenantId, buildingId, scope, periodStart, periodEnd],
    );

    return {
      title: 'Reporte ejecutivo',
      subtitle,
      columns: ['Indicador', 'Valor'],
      rows: kpi.map((r) => [r.label, r.value]),
    };
  }

  private async datasetQuality(
    tenantId: string,
    buildingId: string | null,
    scope: string[],
    periodStart: string,
    periodEnd: string,
    subtitle: string,
  ): Promise<ReportDataset> {
    const rows: Array<{
      name: string;
      code: string;
      v_avg: string;
      thd_max: string;
    }> = await this.dataSource.query(
      `SELECT m.name, m.code,
        COALESCE(AVG(r.voltage_l1), 0)::numeric(10,2)::text AS v_avg,
        COALESCE(MAX(r.thd_voltage_pct), 0)::numeric(10,2)::text AS thd_max
       FROM meters m
       LEFT JOIN readings r ON r.meter_id = m.id
         AND r.tenant_id = m.tenant_id
         AND r.timestamp >= $4::date
         AND r.timestamp < $5::date + INTERVAL '1 day'
       WHERE m.tenant_id = $1
         AND ($2::uuid IS NULL OR m.building_id = $2)
         AND (cardinality($3::uuid[]) = 0 OR m.building_id = ANY($3))
       GROUP BY m.id, m.name, m.code
       ORDER BY m.name`,
      [tenantId, buildingId, scope, periodStart, periodEnd],
    );

    return {
      title: 'Calidad eléctrica (resumen)',
      subtitle,
      columns: ['Medidor', 'Código', 'V L1 prom. (V)', 'THD V máx. (%)'],
      rows: rows.map((r) => [r.name, r.code, r.v_avg, r.thd_max]),
    };
  }

  private async datasetAlerts(
    tenantId: string,
    buildingId: string | null,
    scope: string[],
    periodStart: string,
    periodEnd: string,
    subtitle: string,
  ): Promise<ReportDataset> {
    const rows: Array<{ severity: string; status: string; cnt: string }> =
      await this.dataSource.query(
        `SELECT a.severity, a.status, COUNT(*)::text AS cnt
         FROM alerts a
         WHERE a.tenant_id = $1
           AND ($2::uuid IS NULL OR a.building_id = $2)
           AND (cardinality($3::uuid[]) = 0 OR a.building_id = ANY($3))
           AND a.created_at >= $4::date
           AND a.created_at < $5::date + INTERVAL '1 day'
         GROUP BY a.severity, a.status
         ORDER BY a.severity, a.status`,
        [tenantId, buildingId, scope, periodStart, periodEnd],
      );

    return {
      title: 'Alertas y cumplimiento',
      subtitle,
      columns: ['Severidad', 'Estado', 'Cantidad'],
      rows: rows.map((r) => [r.severity, r.status, r.cnt]),
    };
  }

  private datasetGeneric(
    reportType: PlatformReportType,
    subtitle: string,
  ): ReportDataset {
    return {
      title: `Reporte ${reportType}`,
      subtitle,
      columns: ['Detalle'],
      rows: [['Contenido consolidado no disponible para este tipo en la versión actual.']],
    };
  }
}
