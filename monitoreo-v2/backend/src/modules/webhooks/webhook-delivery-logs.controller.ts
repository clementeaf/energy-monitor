import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { WebhookDeliveryLogsService } from './webhook-delivery-logs.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Webhook Delivery Logs')
@Controller('webhook-delivery-logs')
export class WebhookDeliveryLogsController {
  constructor(private readonly deliveryLogsService: WebhookDeliveryLogsService) {}

  @Get()
  @RequirePermission('webhooks', 'read')
  @ApiOperation({ summary: 'List webhook delivery attempts (paginated)' })
  @ApiQuery({ name: 'status', required: false, enum: ['sent', 'failed'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Paginated delivery logs' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: 'sent' | 'failed',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.deliveryLogsService.findAll(user.tenantId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
