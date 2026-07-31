import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CarbonFootprintService } from './carbon-footprint.service';
import { CarbonFootprintQueryDto, CarbonFootprintMonthlyQueryDto } from './dto/carbon-footprint-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../common/guards/permissions.guard';

@ApiTags('Carbon Footprint')
@Controller('carbon-footprint')
export class CarbonFootprintController {
  constructor(private readonly service: CarbonFootprintService) {}

  @Get('by-building')
  @ApiOperation({ summary: 'CO₂ emissions per building' })
  @RequireAnyPermission('dashboard_executive:read', 'dashboard_technical:read')
  async getByBuilding(
    @CurrentUser() user: JwtPayload,
    @Query() query: CarbonFootprintQueryDto,
  ) {
    return this.service.getByBuilding(user.tenantId, user.buildingIds, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Tenant CO₂ summary' })
  @RequireAnyPermission('dashboard_executive:read', 'dashboard_technical:read')
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: CarbonFootprintQueryDto,
  ) {
    return this.service.getTenantSummary(user.tenantId, user.buildingIds, query);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Monthly CO₂ breakdown' })
  @RequireAnyPermission('dashboard_executive:read', 'dashboard_technical:read')
  async getMonthly(
    @CurrentUser() user: JwtPayload,
    @Query() query: CarbonFootprintMonthlyQueryDto,
  ) {
    return this.service.getMonthlyBreakdown(user.tenantId, user.buildingIds, query);
  }
}
