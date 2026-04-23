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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { QueryReportsDto, QueryScheduledReportsDto } from './dto/query-reports.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { UpdateScheduledReportDto } from './dto/update-scheduled-report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('scheduled')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'List all scheduled reports' })
  @ApiResponse({ status: 200, description: 'Scheduled reports list returned' })
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
  @ApiOperation({ summary: 'Create a scheduled report' })
  @ApiResponse({ status: 201, description: 'Scheduled report created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createScheduled(
    @Body() dto: CreateScheduledReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.createScheduled(user.tenantId, user.sub, dto, user.buildingIds);
  }

  @Patch('scheduled/:id')
  @RequirePermission('reports', 'update')
  @ApiOperation({ summary: 'Update a scheduled report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Scheduled report updated' })
  @ApiResponse({ status: 404, description: 'Scheduled report not found' })
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
  @ApiOperation({ summary: 'Delete a scheduled report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Scheduled report deleted' })
  @ApiResponse({ status: 404, description: 'Scheduled report not found' })
  async removeScheduled(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const ok = await this.reportsService.removeScheduled(id, user.tenantId, user.buildingIds);
    if (!ok) throw new NotFoundException('Scheduled report not found');
  }

  @Post('generate')
  @RequirePermission('reports', 'create')
  @ApiOperation({ summary: 'Generate a report on demand' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async generate(@Body() dto: GenerateReportDto, @CurrentUser() user: JwtPayload) {
    return this.reportsService.generate(user.tenantId, user.sub, dto, user.buildingIds);
  }

  @Get()
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'List all generated reports' })
  @ApiResponse({ status: 200, description: 'Reports list returned' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryReportsDto) {
    return this.reportsService.findAll(user.tenantId, user.buildingIds, {
      buildingId: query.buildingId,
      reportType: query.reportType,
    });
  }

  @Get(':id/export')
  @RequirePermission('reports', 'read')
  @ApiOperation({ summary: 'Export a report as a file download' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 404, description: 'Report not found' })
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
  @ApiOperation({ summary: 'Get a report by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Report returned' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const row = await this.reportsService.findOne(id, user.tenantId, user.buildingIds);
    if (!row) throw new NotFoundException('Report not found');
    return row;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('reports', 'update')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Report deleted' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.reportsService.remove(id, user.tenantId, user.buildingIds);
    if (!ok) throw new NotFoundException('Report not found');
  }
}
