import { Controller, Get } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  async getMyTenant(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Get('me/theme')
  async getMyTheme(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getTheme(user.tenantId);
  }
}
