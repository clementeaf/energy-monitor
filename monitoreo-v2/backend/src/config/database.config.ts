import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { getTypeOrmSslForRds } from '../rds-ssl';

/**
 * Shared PostgreSQL connection fields for primary and read replica.
 */
export function getPostgresConnectionOptions(
  configService: ConfigService,
  hostOverride?: string,
): Pick<
  PostgresConnectionOptions,
  'type' | 'host' | 'port' | 'database' | 'username' | 'password' | 'ssl'
> {
  return {
    type: 'postgres',
    host: hostOverride ?? configService.getOrThrow<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT', 5434),
    database: configService.getOrThrow<string>('DB_NAME'),
    username: configService.getOrThrow<string>('DB_USERNAME'),
    password: configService.getOrThrow<string>('DB_PASSWORD'),
    ssl: getTypeOrmSslForRds(),
  };
}

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  ...getPostgresConnectionOptions(configService),
  autoLoadEntities: true,
  synchronize: configService.get<string>('DB_SYNC') === 'true',
  logging: configService.get<string>('NODE_ENV') === 'development',
});

/**
 * Returns read-replica host when DB_READ_REPLICA_HOST is set (optional).
 * @param configService - Nest config
 * @returns Replica hostname or undefined
 */
export function getReadReplicaHost(configService: ConfigService): string | undefined {
  const host = configService.get<string>('DB_READ_REPLICA_HOST');
  return host && host.length > 0 ? host : undefined;
}
