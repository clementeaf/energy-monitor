import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlatformDashboardService } from './platform-dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../common/guards/permissions.guard';

@ApiTags('Platform Dashboard')
@Controller('platform-dashboard')
export class PlatformDashboardController {
  constructor(private readonly service: PlatformDashboardService) {}

  @Get('kpis')
  @RequireAnyPermission('dashboard_executive:read')
  @ApiOperation({ summary: 'Platform-wide KPIs (super_admin only, cross-tenant)' })
  @ApiResponse({ status: 200, description: 'Platform KPIs returned' })
  @ApiResponse({ status: 403, description: 'Not in cross-tenant mode' })
  async getKpis(@CurrentUser() user: JwtPayload) {
    if (!user.crossTenant) {
      throw new ForbiddenException('Platform dashboard requires cross-tenant mode (no tenant selected)');
    }
    return this.service.getKpis();
  }
}
