import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BaselineService } from './baseline.service';
import { BaselineQueryDto } from './dto/baseline-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../common/guards/permissions.guard';

@ApiTags('Baseline')
@Controller('baseline')
export class BaselineController {
  constructor(private readonly service: BaselineService) {}

  @Get('hourly')
  @ApiOperation({ summary: 'Hourly actual vs baseline comparison' })
  @RequireAnyPermission('dashboard_executive:read', 'dashboard_technical:read')
  async getHourly(
    @CurrentUser() user: JwtPayload,
    @Query() query: BaselineQueryDto,
  ) {
    return this.service.getHourlyBaseline(user.tenantId, user.buildingIds, query);
  }

  @Get('daily')
  @ApiOperation({ summary: 'Daily actual vs baseline comparison' })
  @RequireAnyPermission('dashboard_executive:read', 'dashboard_technical:read')
  async getDaily(
    @CurrentUser() user: JwtPayload,
    @Query() query: BaselineQueryDto,
  ) {
    return this.service.getDailyBaseline(user.tenantId, user.buildingIds, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Baseline deviation summary for a period' })
  @RequireAnyPermission('dashboard_executive:read', 'dashboard_technical:read')
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: BaselineQueryDto,
  ) {
    return this.service.getBaselineSummary(user.tenantId, user.buildingIds, query);
  }
}
