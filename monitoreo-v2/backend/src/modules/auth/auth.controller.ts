import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthService } from './auth.service';
import type { OAuthProfile } from './auth.service';
import { OAuthLoginDto, RefreshTokenDto } from './dto/oauth-login.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly msJwks;
  private readonly googleJwks;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const msTenantId = this.configService.getOrThrow<string>('MICROSOFT_TENANT_ID');
    this.msJwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${msTenantId}/discovery/v2.0/keys`),
    );
    this.googleJwks = createRemoteJWKSet(
      new URL('https://www.googleapis.com/oauth2/v3/certs'),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: OAuthLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = await this.verifyIdToken(dto.provider, dto.idToken);
    const tokens = await this.authService.validateOAuthLogin(profile);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(dto.refreshToken);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.revokeAllTokens(user.sub);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { success: true };
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
    };

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });
  }

  private async verifyIdToken(
    provider: 'microsoft' | 'google',
    idToken: string,
  ): Promise<OAuthProfile> {
    if (provider === 'google') {
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
