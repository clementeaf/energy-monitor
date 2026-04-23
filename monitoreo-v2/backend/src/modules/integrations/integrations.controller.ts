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
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { QueryIntegrationsDto } from './dto/query-integrations.dto';
import { QueryIntegrationSyncLogsDto } from './dto/query-integration-sync-logs.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';
import { ConnectorRegistry } from './connectors/connector.registry';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly connectorRegistry: ConnectorRegistry,
  ) {}

  /** List supported integration types with labels. */
  @Get('supported-types')
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'List supported integration types' })
  @ApiResponse({ status: 200, description: 'Supported types returned' })
  getSupportedTypes() {
    return this.connectorRegistry.listTypes();
  }

  @Get()
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'List all integrations' })
  @ApiResponse({ status: 200, description: 'Integrations list returned' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryIntegrationsDto) {
    return this.integrationsService.findAll(user.tenantId, {
      integrationType: query.integrationType,
      status: query.status,
    });
  }

  @Post()
  @RequirePermission('integrations', 'create')
  @ApiOperation({ summary: 'Create an integration' })
  @ApiResponse({ status: 201, description: 'Integration created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateIntegrationDto, @CurrentUser() user: JwtPayload) {
    return this.integrationsService.create(user.tenantId, dto);
  }

  @Get(':id/sync-logs')
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'Get sync logs for an integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Sync logs returned' })
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
  @ApiOperation({ summary: 'Trigger sync for an integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Sync triggered' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async sync(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.integrationsService.triggerSync(id, user.tenantId);
  }

  @Get(':id')
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'Get an integration by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Integration returned' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const row = await this.integrationsService.findOne(id, user.tenantId);
    if (!row) throw new NotFoundException('Integration not found');
    return row;
  }

  @Patch(':id')
  @RequirePermission('integrations', 'update')
  @ApiOperation({ summary: 'Update an integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Integration updated' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
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
  @ApiOperation({ summary: 'Delete an integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Integration deleted' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.integrationsService.remove(id, user.tenantId);
    if (!ok) throw new NotFoundException('Integration not found');
  }
}
