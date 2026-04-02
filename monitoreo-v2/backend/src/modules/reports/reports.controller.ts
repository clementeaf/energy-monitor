import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { QueryReportsDto, QueryScheduledReportsDto } from './dto/query-reports.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { UpdateScheduledReportDto } from './dto/update-scheduled-report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('scheduled')
  @RequirePermission('reports', 'read')
  async findAllScheduled(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryScheduledReportsDto,
  ) {
    return this.reportsService.findAllScheduled(user.tenantId, user.buildingIds, {
      buildingId: query.buildingId,
      isActive: query.isActive,
    });
  }

  @Post('scheduled')
  @RequirePermission('reports', 'update')
  async createScheduled(
    @Body() dto: CreateScheduledReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.createScheduled(user.tenantId, user.sub, dto, user.buildingIds);
  }

  @Patch('scheduled/:id')
  @RequirePermission('reports', 'update')
  async updateScheduled(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduledReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const row = await this.reportsService.updateScheduled(id, user.tenantId, dto, user.buildingIds);
    if (!row) throw new NotFoundException('Scheduled report not found');
    return row;
  }

  @Delete('scheduled/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('reports', 'update')
  async removeScheduled(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const ok = await this.reportsService.removeScheduled(id, user.tenantId, user.buildingIds);
    if (!ok) throw new NotFoundException('Scheduled report not found');
  }

  @Post('generate')
  @RequirePermission('reports', 'create')
  async generate(@Body() dto: GenerateReportDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.generate(user.tenantId, user.sub, dto, user.buildingIds);
  }

  @Get()
  @RequirePermission('reports', 'read')
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryReportsDto) {
    return this.reportsService.findAll(user.tenantId, user.buildingIds, {
      buildingId: query.buildingId,
      reportType: query.reportType,
    });
  }

  @Get(':id/export')
  @RequirePermission('reports', 'read')
  async export(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { buffer, mime, filename } = await this.reportsService.exportReport(
      id,
      user.tenantId,
      user.buildingIds,
    );
    res.set({
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  @Get(':id')
  @RequirePermission('reports', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const row = await this.reportsService.findOne(id, user.tenantId, user.buildingIds);
    if (!row) throw new NotFoundException('Report not found');
    return row;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('reports', 'update')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.reportsService.remove(id, user.tenantId, user.buildingIds);
    if (!ok) throw new NotFoundException('Report not found');
  }
}
