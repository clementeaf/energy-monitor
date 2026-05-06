import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { CreateBreachReportDto, UpdateBreachReportDto } from './dto/breach-report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

/**
 * Breach report management — Ley 21.719.
 * 72-hour notification deadline to the Agency.
 * Only accessible to users with audit:read permission (typically admin/auditor).
 */
@ApiTags('Breach Reports (Ley 21.719)')
@Controller('admin/breach-reports')
export class BreachReportsController {
  private readonly logger = new Logger(BreachReportsController.name);

  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @RequirePermission('audit', 'read')
  @ApiOperation({ summary: 'List breach reports' })
  @ApiResponse({ status: 200, description: 'Breach reports list' })
  async findAll(@CurrentUser() user: JwtPayload) {
    const rows = await this.dataSource.query(
      `SELECT br.*, u.email AS reported_by_email
       FROM breach_reports br
       JOIN users u ON u.id = br.reported_by
       WHERE br.tenant_id = $1 OR br.tenant_id IS NULL
       ORDER BY br.created_at DESC`,
      [user.tenantId],
    );

    return rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      description: r.description,
      dataTypesAffected: r.data_types_affected,
      estimatedSubjects: r.estimated_subjects,
      severity: r.severity,
      detectedAt: r.detected_at,
      notificationDeadline: r.notification_deadline,
      agencyNotifiedAt: r.agency_notified_at,
      subjectsNotifiedAt: r.subjects_notified_at,
      status: r.status,
      resolutionNotes: r.resolution_notes,
      reportedByEmail: r.reported_by_email,
      createdAt: r.created_at,
    }));
  }

  @Post()
  @RequirePermission('audit', 'read')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create breach report (starts 72h timer)' })
  @ApiResponse({ status: 201, description: 'Breach report created with 72h deadline' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBreachReportDto,
  ) {
    const deadline = new Date(new Date(dto.detectedAt).getTime() + 72 * 60 * 60 * 1000);

    const rows = await this.dataSource.query(
      `INSERT INTO breach_reports
       (tenant_id, reported_by, description, data_types_affected, estimated_subjects, severity, detected_at, notification_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, notification_deadline`,
      [
        user.tenantId,
        user.sub,
        dto.description,
        dto.dataTypesAffected,
        dto.estimatedSubjects ?? null,
        dto.severity,
        dto.detectedAt,
        deadline.toISOString(),
      ],
    );

    this.logger.warn(
      `BREACH REPORT created by ${user.email} — severity=${dto.severity}, deadline=${deadline.toISOString()}`,
    );

    return {
      id: rows[0].id,
      notificationDeadline: rows[0].notification_deadline,
      hoursRemaining: Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)),
    };
  }

  @Patch(':id')
  @RequirePermission('audit', 'read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update breach report (mark notified/resolved)' })
  @ApiResponse({ status: 200, description: 'Report updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBreachReportDto,
  ) {
    const existing = await this.dataSource.query(
      `SELECT id FROM breach_reports WHERE id = $1`,
      [id],
    );
    if (existing.length === 0) throw new NotFoundException('Report not found');

    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let idx = 1;

    if (dto.status) {
      sets.push(`status = $${idx++}`);
      params.push(dto.status);
    }
    if (dto.resolutionNotes) {
      sets.push(`resolution_notes = $${idx++}`);
      params.push(dto.resolutionNotes);
    }
    if (dto.agencyNotifiedAt) {
      sets.push(`agency_notified_at = $${idx++}`);
      params.push(dto.agencyNotifiedAt);
    }
    if (dto.subjectsNotifiedAt) {
      sets.push(`subjects_notified_at = $${idx++}`);
      params.push(dto.subjectsNotifiedAt);
    }

    params.push(id);
    await this.dataSource.query(
      `UPDATE breach_reports SET ${sets.join(', ')} WHERE id = $${idx}`,
      params,
    );

    return { success: true };
  }
}
