import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { OAuthProfile } from './auth.service';
import { MfaService } from './mfa.service';
import { OAuthLoginDto, RefreshTokenDto } from './dto/oauth-login.dto';
import { MfaCodeDto, MfaValidateDto } from './dto/mfa.dto';
import { TenantsService } from '../tenants/tenants.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth & MFA')
@Controller('auth')
export class AuthController {
  private readonly msJwks;
  private readonly googleJwks;

  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
    private readonly configService: ConfigService,
    private readonly tenantsService: TenantsService,
  ) {
    const msTenantId = this.configService.getOrThrow<string>('MICROSOFT_TENANT_ID');
    this.msJwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${msTenantId}/discovery/v2.0/keys`),
    );
    this.googleJwks = createRemoteJWKSet(
      new URL('https://www.googleapis.com/oauth2/v3/certs'),
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth login (Microsoft/Google)' })
  @ApiResponse({ status: 200, description: 'Login successful or MFA required' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async login(
    @Body() dto: OAuthLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = await this.verifyIdToken(dto.provider, dto.idToken);
    const result = await this.authService.validateOAuthLogin(profile);

    // If user has MFA enabled, don't issue tokens yet — require MFA validation
    if ('mfaRequired' in result) {
      return { mfaRequired: true, userId: result.userId };
    }

    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return { success: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and tenant theme' })
  @ApiResponse({ status: 200, description: 'User profile with tenant info' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async me(@CurrentUser() user: JwtPayload) {
    const profile = await this.authService.getUserProfile(user.sub);
    const theme = await this.tenantsService.getTheme(user.tenantId);
    return {
      user: profile,
      tenant: theme,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(dto.refreshToken);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke all tokens' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.revokeAllTokens(user.sub);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { success: true };
  }

  @Post('mfa/setup')
  @ApiOperation({ summary: 'Generate TOTP secret and QR code for MFA setup' })
  @ApiResponse({ status: 201, description: 'TOTP secret and QR URI' })
  async mfaSetup(@CurrentUser() user: JwtPayload) {
    return this.mfaService.setupMfa(user.sub, user.email);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP code and enable MFA' })
  @ApiResponse({ status: 200, description: 'MFA enabled with recovery codes' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  async mfaVerify(
    @CurrentUser() user: JwtPayload,
    @Body() body: MfaCodeDto,
  ) {
    const { recoveryCodes } = await this.mfaService.verifyAndEnable(user.sub, body.code);
    return { success: true, mfaEnabled: true, recoveryCodes };
  }

  @Public()
  @Post('mfa/validate')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate MFA code during login (rate-limited)' })
  @ApiResponse({ status: 200, description: 'MFA validated, tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  async mfaValidate(
    @Body() body: MfaValidateDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const isValid = await this.mfaService.validate(body.userId, body.code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code.');
    }
    const tokens = await this.authService.issueTokensForUser(body.userId);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @Delete('mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA for current user' })
  @ApiResponse({ status: 200, description: 'MFA disabled' })
  async mfaDisable(@CurrentUser() user: JwtPayload) {
    await this.mfaService.disable(user.sub);
    return { success: true, mfaEnabled: false };
  }

  @Get('mfa/status')
  @ApiOperation({ summary: 'Check if MFA is enabled for current user' })
  @ApiResponse({ status: 200, description: 'MFA status' })
  async mfaStatus(@CurrentUser() user: JwtPayload) {
    const enabled = await this.mfaService.isMfaEnabled(user.sub);
    return { mfaEnabled: enabled };
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    // Lax en dev: Strict puede impedir que el navegador envíe la cookie en XHR
    // entre localhost:5173 y localhost:4000 (origen distinto, mismo sitio lax).
    const sameSite: 'strict' | 'lax' = isProduction ? 'strict' : 'lax';
    // __Host- prefix enforces Secure + no Domain + path=/ (prevents cookie tossing attacks)
    const accessName = isProduction ? '__Host-access_token' : 'access_token';
    const refreshName = isProduction ? '__Host-refresh_token' : 'refresh_token';

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
    };

    res.cookie(accessName, accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(refreshName, refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: isProduction ? '/api/auth/refresh' : '/',
    });
  }

  private async verifyIdToken(
    provider: 'microsoft' | 'google',
    idToken: string,
  ): Promise<OAuthProfile> {
    if (provider === 'google') {
      // Try JWT id_token first (credential flow)
      if (idToken.split('.').length === 3) {
        const expectedClientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
        const { payload } = await jwtVerify(idToken, this.googleJwks, {
          issuer: ['https://accounts.google.com', 'accounts.google.com'],
          audience: expectedClientId,
        }).catch(() => {
          throw new UnauthorizedException('Invalid Google token');
        });

        return {
          provider: 'google',
          providerId: payload.sub!,
          email: payload['email'] as string,
          displayName: payload['name'] as string,
        };
      }

      // Fallback: access_token from implicit flow — validate via userinfo
      const res = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${idToken}` } },
      );
      if (!res.ok) {
        throw new UnauthorizedException('Invalid Google access token');
      }
      const info = (await res.json()) as {
        sub: string;
        email: string;
        name: string;
      };

      return {
        provider: 'google',
        providerId: info.sub,
        email: info.email,
        displayName: info.name,
      };
    }

    if (provider === 'microsoft') {
      const expectedClientId = this.configService.getOrThrow<string>('MICROSOFT_CLIENT_ID');
      const msTenantId = this.configService.getOrThrow<string>('MICROSOFT_TENANT_ID');
      const { payload } = await jwtVerify(idToken, this.msJwks, {
        issuer: `https://login.microsoftonline.com/${msTenantId}/v2.0`,
        audience: expectedClientId,
      }).catch(() => {
        throw new UnauthorizedException('Invalid Microsoft token');
      });

      return {
        provider: 'microsoft',
        providerId: payload.sub!,
        email: (payload['preferred_username'] ?? payload['email']) as string,
        displayName: payload['name'] as string,
      };
    }

    throw new UnauthorizedException('Unsupported provider');
  }
}
