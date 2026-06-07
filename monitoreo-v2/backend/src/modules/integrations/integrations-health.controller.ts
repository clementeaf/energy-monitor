import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IntegrationsHealthService } from './integrations-health.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Integrations')
@Controller('v1/integrations')
export class IntegrationsHealthController {
  constructor(private readonly integrationsHealthService: IntegrationsHealthService) {}

  @Get('health')
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'Integration sync latency and webhook delivery health' })
  @ApiResponse({ status: 200, description: 'Health snapshot returned' })
  getHealth(@CurrentUser() user: JwtPayload) {
    return this.integrationsHealthService.getHealth(user.tenantId);
  }
}
