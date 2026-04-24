import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { getTypeOrmSslForRds } from '../rds-ssl';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.getOrThrow<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT', 5434),
  database: configService.getOrThrow<string>('DB_NAME'),
  username: configService.getOrThrow<string>('DB_USERNAME'),
  password: configService.getOrThrow<string>('DB_PASSWORD'),
  autoLoadEntities: true,
  synchronize: configService.get<string>('DB_SYNC') === 'true',
  ssl: getTypeOrmSslForRds(),
  logging: configService.get<string>('NODE_ENV') === 'development',
});
