import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { DataRetentionService } from './data-retention.service';
import { AuthController } from './auth.controller';
import { PrivacyController } from './privacy.controller';
import { BreachReportsController } from './breach-reports.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TenantsModule } from '../tenants/tenants.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TenantsModule,
    RolesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController, PrivacyController, BreachReportsController],
  providers: [AuthService, MfaService, DataRetentionService, JwtStrategy],
  exports: [AuthService, MfaService],
})
export class AuthModule {}
