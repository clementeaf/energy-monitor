import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WebhookSubscriptionsService } from './webhook-subscriptions.service';
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';
import { UpdateWebhookSubscriptionDto } from './dto/update-webhook-subscription.dto';
import { QueryWebhookSubscriptionsDto } from './dto/query-webhook-subscriptions.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Webhooks')
@Controller('webhook-subscriptions')
export class WebhookSubscriptionsController {
  constructor(private readonly webhookSubscriptionsService: WebhookSubscriptionsService) {}

  @Get()
  @RequirePermission('webhooks', 'read')
  @ApiOperation({ summary: 'List webhook subscriptions for tenant' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryWebhookSubscriptionsDto,
  ) {
    return this.webhookSubscriptionsService.findAll(user.tenantId, {
      eventType: query.eventType,
      active: query.active,
    });
  }

  @Post()
  @RequirePermission('webhooks', 'create')
  @ApiOperation({ summary: 'Create webhook subscription' })
  async create(@Body() dto: CreateWebhookSubscriptionDto, @CurrentUser() user: JwtPayload) {
    return this.webhookSubscriptionsService.create(user.tenantId, dto);
  }

  @Get(':id')
  @RequirePermission('webhooks', 'read')
  @ApiParam({ name: 'id', format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const row = await this.webhookSubscriptionsService.findOne(id, user.tenantId);
    if (!row) throw new NotFoundException('Webhook subscription not found');
    return row;
  }

  @Patch(':id')
  @RequirePermission('webhooks', 'update')
  @ApiParam({ name: 'id', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const row = await this.webhookSubscriptionsService.update(id, user.tenantId, dto);
    if (!row) throw new NotFoundException('Webhook subscription not found');
    return row;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('webhooks', 'delete')
  @ApiParam({ name: 'id', format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.webhookSubscriptionsService.remove(id, user.tenantId);
    if (!ok) throw new NotFoundException('Webhook subscription not found');
  }
}
