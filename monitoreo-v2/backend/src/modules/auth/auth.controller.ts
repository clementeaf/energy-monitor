import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { OAuthProfile } from './auth.service';
import { PRIVACY_POLICY_VERSION } from './auth.service';
import { MfaService } from './mfa.service';
import { OAuthLoginDto, RefreshTokenDto } from './dto/oauth-login.dto';
import { MfaCodeDto, MfaValidateDto } from './dto/mfa.dto';
import { DeletionRequestDto } from './dto/deletion-request.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RectificationRequestDto } from './dto/rectification-request.dto';
import { AutomatedDecisionsDto } from './dto/automated-decisions.dto';
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

    // If role requires MFA but user hasn't set it up — issue tokens but flag it
    // (user needs access to settings page to configure MFA)
    if ('mfaSetupRequired' in result) {
      const tokens = await this.authService.issueTokensForUser(result.userId);
      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
      return { success: true, mfaSetupRequired: true };
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

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own profile (ARCO+ rectification)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    await this.authService.updateProfile(user.sub, dto);
    return { success: true };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Accept refresh token from body or httpOnly cookie (__Host- prefix in production)
    const refreshToken =
      dto.refreshToken ||
      (req.cookies?.['__Host-refresh_token'] as string) ||
      (req.cookies?.['refresh_token'] as string);
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
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
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const accessName = isProduction ? '__Host-access_token' : 'access_token';
    const refreshName = isProduction ? '__Host-refresh_token' : 'refresh_token';
    res.clearCookie(accessName, { path: '/' });
    res.clearCookie(refreshName, {
      path: isProduction ? '/api/auth/refresh' : '/',
    });
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

  /* ── Ley 21.719: Privacy & Data Rights ── */

  @Post('accept-privacy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept privacy policy (Ley 21.719 consent)' })
  @ApiResponse({ status: 200, description: 'Privacy policy accepted' })
  async acceptPrivacy(@CurrentUser() user: JwtPayload) {
    await this.authService.acceptPrivacyPolicy(user.sub);
    return { success: true, version: PRIVACY_POLICY_VERSION };
  }

  @Get('me/export')
  @ApiOperation({ summary: 'Export personal data (ARCO+ portability right)' })
  @ApiResponse({ status: 200, description: 'Personal data export' })
  async exportMyData(@CurrentUser() user: JwtPayload) {
    return this.authService.exportUserData(user.sub);
  }

  @Post('me/deletion-request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request account deletion (ARCO+ cancellation right)' })
  @ApiResponse({ status: 201, description: 'Deletion request created' })
  async requestDeletion(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DeletionRequestDto,
  ) {
    return this.authService.createDeletionRequest(user.sub, user.tenantId, dto.reason);
  }

  @Post('me/oppose')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Oppose data processing (ARCO+ opposition right)' })
  @ApiResponse({ status: 200, description: 'Opposition registered, processing blocked' })
  async opposeProcessing(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DeletionRequestDto,
  ) {
    await this.authService.blockProcessing(user.sub, dto.reason ?? 'Derecho de oposición ejercido por el titular');
    return { success: true, blocked: true };
  }

  @Post('me/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block data processing temporarily (ARCO+ blocking right)' })
  @ApiResponse({ status: 200, description: 'Processing blocked temporarily' })
  async blockProcessing(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DeletionRequestDto,
  ) {
    await this.authService.blockProcessing(user.sub, dto.reason ?? 'Bloqueo solicitado por el titular');
    return { success: true, blocked: true };
  }

  @Post('revoke-privacy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke privacy policy consent (Ley 21.719)' })
  @ApiResponse({ status: 200, description: 'Consent revoked, session terminated' })
  async revokePrivacy(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.revokePrivacyConsent(user.sub);
    await this.authService.revokeAllTokens(user.sub);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const accessName = isProduction ? '__Host-access_token' : 'access_token';
    const refreshName = isProduction ? '__Host-refresh_token' : 'refresh_token';
    res.clearCookie(accessName, { path: '/' });
    res.clearCookie(refreshName, { path: isProduction ? '/api/auth/refresh' : '/' });
    return { success: true, message: 'Consentimiento revocado. Sesión terminada.' };
  }

  @Post('me/rectification-request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request data rectification (ARCO+ — fields requiring admin approval)' })
  @ApiResponse({ status: 201, description: 'Rectification request created' })
  async requestRectification(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RectificationRequestDto,
  ) {
    return this.authService.createRectificationRequest(user.sub, user.tenantId, dto);
  }

  @Post('me/automated-decisions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle opt-out of automated decisions (Ley 21.719 Art. 8 bis)' })
  @ApiResponse({ status: 200, description: 'Preference updated' })
  async toggleAutomatedDecisions(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AutomatedDecisionsDto,
  ) {
    await this.authService.setAutomatedDecisionsOptOut(user.sub, dto.optOut);
    return { success: true, optOutAutomatedDecisions: dto.optOut };
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
