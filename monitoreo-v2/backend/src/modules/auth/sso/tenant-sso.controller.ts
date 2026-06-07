import { Body, Controller, Get, Headers, Param, Post, Put, Query, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantSsoService } from './tenant-sso.service';
import { AuthService } from '../auth.service';
import { UpsertTenantSsoConfigDto } from '../dto/upsert-tenant-sso-config.dto';
import { ScimDeprovisionDto } from '../dto/scim-deprovision.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { RequirePermission } from '../../../common/guards/permissions.guard';

@ApiTags('Tenant SSO')
@Controller()
export class TenantSsoController {
  constructor(
    private readonly tenantSsoService: TenantSsoService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('auth/sso/:tenantSlug/config')
  @ApiOperation({ summary: 'Public SSO config for login page' })
  getPublicConfig(@Param('tenantSlug') tenantSlug: string) {
    return this.tenantSsoService.getPublicConfig(tenantSlug);
  }

  @Public()
  @Get('auth/sso/:tenantSlug/start')
  @ApiOperation({ summary: 'Start OIDC SSO login (returns redirect URL)' })
  startLogin(@Param('tenantSlug') tenantSlug: string) {
    return this.tenantSsoService.startLogin(tenantSlug);
  }

  @Public()
  @Get('auth/sso/callback')
  @ApiOperation({ summary: 'OIDC callback — issues session cookies and redirects to frontend' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend after login' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = await this.tenantSsoService.handleCallback(code, state);
    const result = await this.authService.validateSsoLogin(profile);

    if ('mfaRequired' in result) {
      const frontend = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
      res.redirect(`${frontend}/login?mfaRequired=1&userId=${result.userId}`);
      return;
    }

    if ('mfaSetupRequired' in result) {
      const tokens = await this.authService.issueTokensForUser(result.userId);
      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
      const frontend = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
      res.redirect(`${frontend}/login?mfaSetupRequired=1`);
      return;
    }

    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    const frontend = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    res.redirect(`${frontend}/`);
  }

  @Get('admin/tenant-sso/:tenantId')
  @RequirePermission('sso', 'read')
  @ApiOperation({ summary: 'Get tenant SSO config (admin, secrets redacted)' })
  getConfig(@Param('tenantId') tenantId: string) {
    return this.tenantSsoService.getConfigForAdmin(tenantId);
  }

  @Put('admin/tenant-sso/:tenantId')
  @RequirePermission('sso', 'update')
  @ApiOperation({ summary: 'Upsert tenant SSO config' })
  upsertConfig(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpsertTenantSsoConfigDto,
  ) {
    return this.tenantSsoService.upsertConfig(tenantId, dto);
  }

  @Public()
  @Post('auth/scim/:tenantId/deprovision')
  @ApiOperation({ summary: 'SCIM stub — deactivate user on IdP delete' })
  deprovision(
    @Param('tenantId') tenantId: string,
    @Headers('x-scim-webhook-secret') webhookSecret: string | undefined,
    @Body() dto: ScimDeprovisionDto,
  ) {
    if (!webhookSecret) {
      throw new UnauthorizedException('Missing X-Scim-Webhook-Secret header');
    }
    return this.tenantSsoService.deprovisionUser(tenantId, webhookSecret, dto);
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const sameSite: 'strict' | 'lax' = isProduction ? 'strict' : 'lax';
    const accessName = isProduction ? '__Host-access_token' : 'access_token';
    const refreshName = isProduction ? '__Host-refresh_token' : 'refresh_token';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
    };
    res.cookie(accessName, accessToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie(refreshName, refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: isProduction ? '/api/auth/refresh' : '/',
    });
  }
}
