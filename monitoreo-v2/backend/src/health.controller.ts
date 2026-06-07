import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from './common/decorators/public.decorator';

export type HealthDbStatus = 'ok' | 'fail';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  db: HealthDbStatus;
  schemaVersion: string | null;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Liveness/readiness probe with DB connectivity and latest schema migration.
   */
  @Get()
  @Public()
  async check(): Promise<HealthCheckResponse> {
    let db: HealthDbStatus = 'fail';
    let schemaVersion: string | null = null;

    try {
      await this.dataSource.query('SELECT 1');
      db = 'ok';
      schemaVersion = await this.fetchLatestSchemaVersion();
    } catch {
      db = 'fail';
    }

    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      db,
      schemaVersion,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns the most recently applied schema migration version, if registry exists.
   */
  private async fetchLatestSchemaVersion(): Promise<string | null> {
    try {
      const rows: Array<{ version: string }> = await this.dataSource.query(
        `SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1`,
      );
      return rows[0]?.version ?? null;
    } catch {
      return null;
    }
  }
}
