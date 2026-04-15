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
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { QueryIntegrationsDto } from './dto/query-integrations.dto';
import { QueryIntegrationSyncLogsDto } from './dto/query-integration-sync-logs.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';
import { ConnectorRegistry } from './connectors/connector.registry';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly connectorRegistry: ConnectorRegistry,
  ) {}

  /** List supported integration types with labels. */
  @Get('supported-types')
  @RequirePermission('integrations', 'read')
  getSupportedTypes() {
    return this.connectorRegistry.listTypes();
  }

  @Get()
  @RequirePermission('integrations', 'read')
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryIntegrationsDto) {
    return this.integrationsService.findAll(user.tenantId, {
      integrationType: query.integrationType,
      status: query.status,
    });
  }

  @Post()
  @RequirePermission('integrations', 'create')
  async create(@Body() dto: CreateIntegrationDto, @CurrentUser() user: JwtPayload) {
    return this.integrationsService.create(user.tenantId, dto);
  }

  @Get(':id/sync-logs')
  @RequirePermission('integrations', 'read')
  async syncLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryIntegrationSyncLogsDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.integrationsService.findSyncLogs(id, user.tenantId, page, limit);
  }

  @Post(':id/sync')
  @RequirePermission('integrations', 'update')
  async sync(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.integrationsService.triggerSync(id, user.tenantId);
  }

  @Get(':id')
  @RequirePermission('integrations', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const row = await this.integrationsService.findOne(id, user.tenantId);
    if (!row) throw new NotFoundException('Integration not found');
    return row;
  }

  @Patch(':id')
  @RequirePermission('integrations', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIntegrationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const row = await this.integrationsService.update(id, user.tenantId, dto);
    if (!row) throw new NotFoundException('Integration not found');
    return row;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('integrations', 'update')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.integrationsService.remove(id, user.tenantId);
    if (!ok) throw new NotFoundException('Integration not found');
  }
}
