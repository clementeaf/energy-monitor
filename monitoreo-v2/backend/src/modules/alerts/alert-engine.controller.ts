import { Controller, Post, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AlertEngineService } from './alert-engine.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Alert Engine')
@Controller('alert-engine')
export class AlertEngineController {
  constructor(private readonly engineService: AlertEngineService) {}

  @Post('evaluate')
  @ApiOperation({ summary: 'Trigger alert rule evaluation for current tenant' })
  @ApiResponse({ status: 200, description: 'Evaluation results' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(200)
  @RequirePermission('alerts', 'update')
  async evaluate(@CurrentUser() user: JwtPayload) {
    return this.engineService.evaluateTenant(user.tenantId);
  }
}
