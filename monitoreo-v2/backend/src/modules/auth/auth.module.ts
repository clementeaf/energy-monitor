import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { DataRetentionService } from './data-retention.service';
import { AuthController } from './auth.controller';
import { PrivacyController } from './privacy.controller';
import { BreachReportsController } from './breach-reports.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TenantsModule } from '../tenants/tenants.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSsoConfig } from './entities/tenant-sso-config.entity';
import { TenantSsoService } from './sso/tenant-sso.service';
import { TenantSsoController } from './sso/tenant-sso.controller';
import { HttpOidcClient } from './sso/http-oidc.client';
import { MockOidcClient } from './sso/mock-oidc.client';
import { OIDC_CLIENT } from './sso/oidc-client.interface';
import { JwtBlacklistService } from './jwt-blacklist.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TenantsModule,
    RolesModule,
    TypeOrmModule.forFeature([TenantSsoConfig]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController, PrivacyController, BreachReportsController, TenantSsoController],
  providers: [
    AuthService,
    MfaService,
    DataRetentionService,
    JwtBlacklistService,
    JwtStrategy,
    TenantSsoService,
    HttpOidcClient,
    MockOidcClient,
    {
      provide: OIDC_CLIENT,
      useFactory: (config: ConfigService, http: HttpOidcClient, mock: MockOidcClient) => {
        if (config.get<string>('MOCK_OIDC') === 'true') {
          return mock;
        }
        return http;
      },
      inject: [ConfigService, HttpOidcClient, MockOidcClient],
    },
  ],
  exports: [AuthService, MfaService],
})
export class AuthModule {}
