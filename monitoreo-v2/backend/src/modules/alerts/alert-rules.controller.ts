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
import { AlertRulesService } from './alert-rules.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../../common/guards/permissions.guard';

@Controller('alert-rules')
export class AlertRulesController {
  constructor(private readonly alertRulesService: AlertRulesService) {}

  @Get()
  @RequireAnyPermission('alerts:read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.alertRulesService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
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
  @RequirePermission('alerts', 'create')
  async create(
    @Body() dto: CreateAlertRuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.alertRulesService.create(user.tenantId, dto, user.sub);
  }

  @Patch(':id')
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
