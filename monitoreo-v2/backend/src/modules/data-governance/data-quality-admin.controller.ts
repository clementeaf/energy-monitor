import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DataQualityReportService } from './data-quality-report.service';
import { DataGovernanceAdminService } from './data-governance-admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Data Quality (Admin)')
@Controller('admin/data-quality')
export class DataQualityAdminController {
  constructor(
    private readonly reportService: DataQualityReportService,
    private readonly governanceAdminService: DataGovernanceAdminService,
  ) {}

  @Get('report')
  @RequirePermission('data_quality', 'read')
  @ApiOperation({ summary: 'Data quality report by building and day (super_admin cross-tenant)' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'from', required: true, example: '2026-06-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-06-06' })
  @ApiResponse({ status: 200, description: 'Quality report JSON' })
  getReport(
    @CurrentUser() user: JwtPayload,
    @Query('tenantId') tenantId: string | undefined,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportService.getReport(user, tenantId, from, to);
  }

  @Get('balance-anomalies')
  @RequirePermission('data_quality', 'read')
  @ApiOperation({ summary: 'List meter balance discrepancies (parent vs children)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listBalanceAnomalies(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.governanceAdminService.listBalanceAnomalies(
      user.tenantId,
      from,
      to,
      parsedLimit,
    );
  }

  @Get('slo-breaches')
  @RequirePermission('data_quality', 'read')
  @ApiOperation({ summary: 'List recent data SLO breaches' })
  @ApiQuery({ name: 'limit', required: false })
  listSloBreaches(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.governanceAdminService.listSloBreaches(user.tenantId, parsedLimit);
  }

  @Get('data-contracts')
  @RequirePermission('data_quality', 'read')
  @ApiOperation({ summary: 'List active data export contracts' })
  listDataContracts(@CurrentUser() user: JwtPayload) {
    return this.governanceAdminService.listDataContracts(user.tenantId);
  }
}
