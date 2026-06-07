import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { getPostgresConnectionOptions, getReadReplicaHost } from '../config/database.config';

/**
 * Optional read-replica connection; falls back to primary when unset or unavailable.
 */
@Injectable()
export class ReadReplicaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReadReplicaService.name);
  private replicaDs: DataSource | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly primaryDs: DataSource,
  ) {}

  /**
   * Initializes the read replica DataSource when DB_READ_REPLICA_HOST is configured.
   */
  async onModuleInit(): Promise<void> {
    const host = getReadReplicaHost(this.configService);
    if (!host) return;

    const options: PostgresConnectionOptions = {
      ...getPostgresConnectionOptions(this.configService, host),
      entities: [],
    };

    this.replicaDs = new DataSource(options);
    try {
      await this.replicaDs.initialize();
      this.logger.log(`Read replica connected (${host})`);
    } catch (err) {
      this.logger.warn(
        `Read replica unavailable (${host}); falling back to primary: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
      this.replicaDs = null;
    }
  }

  /**
   * Closes the replica connection on shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.replicaDs?.isInitialized) {
      await this.replicaDs.destroy();
    }
  }

  /**
   * Returns the active reader DataSource (replica or primary).
   */
  getReader(): DataSource {
    if (this.replicaDs?.isInitialized) {
      return this.replicaDs;
    }
    return this.primaryDs;
  }

  /**
   * Executes a read query on the replica when available.
   */
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
    return this.getReader().query(sql, params) as Promise<T>;
  }

  /**
   * True when a dedicated read replica connection is active.
   */
  isReplicaActive(): boolean {
    return this.replicaDs?.isInitialized === true;
  }
}
