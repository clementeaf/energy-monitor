import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Notification Logs')
@Controller('notification-logs')
export class NotificationLogsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notification logs with optional filters' })
  @ApiQuery({ name: 'alertId', required: false, type: 'string' })
  @ApiQuery({ name: 'channel', required: false, type: 'string' })
  @ApiQuery({ name: 'status', required: false, type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiQuery({ name: 'offset', required: false, type: 'number' })
  @ApiResponse({ status: 200, description: 'Paginated notification logs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
