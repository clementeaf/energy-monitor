import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { AlertQueryDto } from './dto/alert-query.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../common/guards/permissions.guard';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List alerts with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of alerts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequireAnyPermission('alerts:read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: AlertQueryDto,
  ) {
    return this.alertsService.findAll(user.tenantId, user.buildingIds, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Alert details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @RequireAnyPermission('alerts:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const alert = await this.alertsService.findOne(id, user.tenantId, user.buildingIds);
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  @Patch(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @RequireAnyPermission('alerts:update')
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const alert = await this.alertsService.acknowledge(id, user.tenantId, user.buildingIds, user.sub);
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve an alert with resolution notes' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @RequireAnyPermission('alerts:update')
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const alert = await this.alertsService.resolve(
      id,
      user.tenantId,
      user.buildingIds,
      user.sub,
      dto.resolutionNotes,
    );
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }
}
