import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { SessionModule } from './session/session.module';
import { BuildingsModule } from './buildings/buildings.module';
import { StoresModule } from './stores/stores.module';
import { MeterMonthlyModule } from './meter-monthly/meter-monthly.module';
import { MeterReadingsModule } from './meter-readings/meter-readings.module';
import { RawReadingsModule } from './raw-readings/raw-readings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST') ?? 'localhost',
        port: config.get<number>('DB_PORT') ?? 5432,
        database: config.get<string>('DB_NAME') ?? 'energy_monitor',
        username: config.get<string>('DB_USERNAME') ?? 'postgres',
        password: config.get<string>('DB_PASSWORD') ?? '',
        autoLoadEntities: true,
        synchronize: false,
        ssl:
          config.get<string>('NODE_ENV') === 'production' ||
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    AuthModule,
    RolesModule,
    UsersModule,
    SessionModule,
    BuildingsModule,
    StoresModule,
    MeterMonthlyModule,
    MeterReadingsModule,
    RawReadingsModule,
  ],
})
export class AppModule {}
