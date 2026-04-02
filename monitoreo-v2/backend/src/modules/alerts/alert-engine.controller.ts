import { Controller, Post, HttpCode } from '@nestjs/common';
import { AlertEngineService } from './alert-engine.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('alert-engine')
export class AlertEngineController {
  constructor(private readonly engineService: AlertEngineService) {}

  @Post('evaluate')
  @HttpCode(200)
  @RequirePermission('alerts', 'write')
  async evaluate(@CurrentUser() user: JwtPayload) {
    return this.engineService.evaluateTenant(user.tenantId);
  }
}
