import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AlertRulesService } from './alert-rules.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../../common/guards/permissions.guard';

@ApiTags('Alert Rules')
@Controller('alert-rules')
export class AlertRulesController {
  constructor(private readonly alertRulesService: AlertRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List alert rules' })
  @ApiQuery({ name: 'buildingId', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'List of alert rules' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequireAnyPermission('alerts:read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.alertRulesService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert rule by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Alert rule details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Alert rule not found' })
  @RequireAnyPermission('alerts:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const rule = await this.alertRulesService.findOne(id, user.tenantId, user.buildingIds);
    if (!rule) throw new NotFoundException('Alert rule not found');
    return rule;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermission('alerts', 'create')
  async create(
    @Body() dto: CreateAlertRuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertRulesService.create(user.tenantId, dto, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an alert rule' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Alert rule updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Alert rule not found' })
  @RequirePermission('alerts', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const rule = await this.alertRulesService.update(id, user.tenantId, dto);
    if (!rule) throw new NotFoundException('Alert rule not found');
    return rule;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an alert rule' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Alert rule deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Alert rule not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('alerts', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.alertRulesService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Alert rule not found');
  }
}
