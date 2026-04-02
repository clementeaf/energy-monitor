import { Controller, Get, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('notification-logs')
export class NotificationLogsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @RequirePermission('alerts', 'read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('alertId') alertId?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationService.findLogs(user.tenantId, {
      alertId,
      channel,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
