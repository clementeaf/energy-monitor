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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /** Current user's tenant info. */
  @Get('me')
  @ApiOperation({ summary: 'Get current user tenant info' })
  @ApiResponse({ status: 200, description: 'Tenant info returned' })
  async getMyTenant(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  /** Current user's tenant theme. */
  @Get('me/theme')
  @ApiOperation({ summary: 'Get current user tenant theme' })
  @ApiResponse({ status: 200, description: 'Theme returned' })
  async getMyTheme(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getTheme(user.tenantId);
  }

  /** Self-service: update own tenant settings (admin only). */
  @Patch('me')
  @RequirePermission('admin_tenants', 'update')
  @ApiOperation({ summary: 'Update own tenant settings' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateMyTenant(@Body() dto: UpdateTenantDto, @CurrentUser() user: JwtPayload) {
    const row = await this.tenantsService.update(user.tenantId, dto);
    if (!row) throw new NotFoundException('Tenant not found');
    return row;
  }

  /** List all tenants (super_admin only). */
  @Get()
  @RequirePermission('admin_tenants', 'read')
  @ApiOperation({ summary: 'List all tenants' })
  @ApiResponse({ status: 200, description: 'Tenants list returned' })
  async findAll() {
    return this.tenantsService.findAll();
  }

  /** Onboard a new tenant: create tenant + roles + first admin user. */
  @Post()
  @RequirePermission('admin_tenants', 'create')
  @ApiOperation({ summary: 'Onboard a new tenant with roles and admin user' })
  @ApiResponse({ status: 201, description: 'Tenant onboarded' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async onboard(@Body() dto: CreateTenantDto) {
    return this.tenantsService.onboard(dto);
  }

  /** Get a specific tenant by ID. */
  @Get(':id')
  @RequirePermission('admin_tenants', 'read')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tenant returned' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findById(id);
  }

  /** Update tenant config/theme. */
  @Patch(':id')
  @RequirePermission('admin_tenants', 'update')
  @ApiOperation({ summary: 'Update a tenant by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    const row = await this.tenantsService.update(id, dto);
    if (!row) throw new NotFoundException('Tenant not found');
    return row;
  }

  /** Soft-delete (deactivate) a tenant. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_tenants', 'update')
  @ApiOperation({ summary: 'Deactivate a tenant (soft-delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Tenant deactivated' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const ok = await this.tenantsService.deactivate(id);
    if (!ok) throw new NotFoundException('Tenant not found');
  }
}
