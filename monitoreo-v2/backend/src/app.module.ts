import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { getDatabaseConfig } from './config/database.config';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { TenantOverrideInterceptor } from './common/interceptors/tenant-override.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PlatformModule } from './modules/platform/platform.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { MetersModule } from './modules/meters/meters.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ReadingsModule } from './modules/readings/readings.module';
import { HierarchyModule } from './modules/hierarchy/hierarchy.module';
import { FaultEventsModule } from './modules/fault-events/fault-events.module';
import { ConcentratorsModule } from './modules/concentrators/concentrators.module';
import { TenantUnitsModule } from './modules/tenant-units/tenant-units.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { IotReadingsModule } from './modules/iot-readings/iot-readings.module';
import { PlatformDashboardModule } from './modules/platform-dashboard/platform-dashboard.module';
import { ApiKeyGuard } from './modules/api-keys/guards/api-key.guard';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Config from env vars (ISO 27001: no hardcoded secrets)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    // Scheduler (cron jobs for alert engine + escalation)
    ScheduleModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // Rate limiting (ISO 27001: prevent brute force)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 1000,
      },
    ]),

    // Feature modules
    AuthModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    PlatformModule,
    BuildingsModule,
    MetersModule,
    AlertsModule,
    ReadingsModule,
    HierarchyModule,
    FaultEventsModule,
    ConcentratorsModule,
    TenantUnitsModule,
    TariffsModule,
    InvoicesModule,
    AuditLogsModule,
    ReportsModule,
    IntegrationsModule,
    ApiKeysModule,
    ExternalApiModule,
    IotReadingsModule,
    PlatformDashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global rate limiter guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global API key guard (runs before JWT; activates only when X-API-Key header present)
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    // Global JWT auth guard (skip with @Public() or when ApiKeyGuard already authenticated)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global permissions guard (skip with @Public())
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // super_admin tenant override via ?tenantId= query param
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantOverrideInterceptor,
    },
    // Global audit log (ISO 27001: immutable audit trail)
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
