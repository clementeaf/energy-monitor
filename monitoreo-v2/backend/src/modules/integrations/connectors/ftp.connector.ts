import { Logger } from '@nestjs/common';
import type { Integration } from '../../platform/entities/integration.entity';
import type { IntegrationConnector, SyncResult, FtpConfig } from './connector.interface';
import { withRetry } from './retry.util';

/**
 * Connector for FTP/FTPS servers.
 * Connects, lists files matching a pattern in the remote path, reports count.
 */
export class FtpConnector implements IntegrationConnector {
  readonly type = 'ftp';
  readonly label = 'FTP';
  private readonly logger = new Logger(FtpConnector.name);

  validateConfig(config: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const c = config as Partial<FtpConfig>;

    if (!c.host || typeof c.host !== 'string') {
      errors.push('host is required and must be a string');
    }

    if (c.port !== undefined && (typeof c.port !== 'number' || c.port < 1 || c.port > 65535)) {
      errors.push('port must be a number between 1 and 65535');
    }

    if (c.username !== undefined && typeof c.username !== 'string') {
      errors.push('username must be a string');
    }

    if (c.password !== undefined && typeof c.password !== 'string') {
      errors.push('password must be a string');
    }

    if (c.remotePath !== undefined && typeof c.remotePath !== 'string') {
      errors.push('remotePath must be a string');
    }

    if (c.secure !== undefined && typeof c.secure !== 'boolean') {
      errors.push('secure must be a boolean');
    }

    if (c.filePattern !== undefined && typeof c.filePattern !== 'string') {
      errors.push('filePattern must be a string');
    }

    return errors;
  }

  async sync(integration: Integration): Promise<SyncResult> {
    const config = integration.config as FtpConfig;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('basic-ftp') as typeof import('basic-ftp');

    const client = new Client();
    client.ftp.verbose = false;

    try {
      const result = await withRetry(
        () => this.doSync(client, config),
        { maxRetries: 1, delayMs: 2000 },
      );

      this.logger.log(
        `[${integration.name}] FTP sync: ${result.recordsSynced} files found`,
      );
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[${integration.name}] FTP sync failed: ${msg}`);
      return { status: 'failed', recordsSynced: 0, errorMessage: msg };
    } finally {
      client.close();
    }
  }

  /* ------------------------------------------------------------------ */

  private async doSync(
    client: InstanceType<(typeof import('basic-ftp'))['Client']>,
    config: FtpConfig,
  ): Promise<SyncResult> {
    await client.access({
      host: config.host,
      port: config.port ?? 21,
      user: config.username ?? 'anonymous',
      password: config.password ?? '',
      secure: config.secure ?? false,
    });

    const remotePath = config.remotePath ?? '/';
    const listing = await client.list(remotePath);

    let files = listing.filter((item) => item.type !== 2); // exclude directories
    if (config.filePattern) {
      const pattern = this.globToRegex(config.filePattern);
      files = files.filter((f) => pattern.test(f.name));
    }

    return {
      status: 'success',
      recordsSynced: files.length,
      errorMessage: null,
    };
  }

  /** Convert simple glob (*.csv, data_*.xml) to regex. */
  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`, 'i');
  }
}
