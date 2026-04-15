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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /** Current user's tenant info. */
  @Get('me')
  async getMyTenant(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  /** Current user's tenant theme. */
  @Get('me/theme')
  async getMyTheme(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getTheme(user.tenantId);
  }

  /** List all tenants (super_admin only). */
  @Get()
  @RequirePermission('admin_tenants', 'read')
  async findAll() {
    return this.tenantsService.findAll();
  }

  /** Onboard a new tenant: create tenant + roles + first admin user. */
  @Post()
  @RequirePermission('admin_tenants', 'create')
  async onboard(@Body() dto: CreateTenantDto) {
    return this.tenantsService.onboard(dto);
  }

  /** Get a specific tenant by ID. */
  @Get(':id')
  @RequirePermission('admin_tenants', 'read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.findById(id);
  }

  /** Update tenant config/theme. */
  @Patch(':id')
  @RequirePermission('admin_tenants', 'update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    const row = await this.tenantsService.update(id, dto);
    if (!row) throw new NotFoundException('Tenant not found');
    return row;
  }

  /** Soft-delete (deactivate) a tenant. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_tenants', 'update')
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const ok = await this.tenantsService.deactivate(id);
    if (!ok) throw new NotFoundException('Tenant not found');
  }
}
