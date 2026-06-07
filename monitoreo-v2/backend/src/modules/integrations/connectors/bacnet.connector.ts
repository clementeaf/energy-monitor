import { Logger } from '@nestjs/common';
import type { Integration } from '../../platform/entities/integration.entity';
import type { IntegrationConnector, SyncResult, BacnetConfig } from './connector.interface';
import {
  UdpBacnetPingClient,
  type BacnetPingClient,
} from './bacnet-ping.client';

const DEFAULT_BACNET_PORT = 47808;
const DEFAULT_TIMEOUT_MS = 6_000;

/**
 * Read-only BACnet/IP connector — validates config and pings device via Who-Is.
 */
export class BacnetConnector implements IntegrationConnector {
  readonly type = 'bacnet';
  readonly label = 'BACnet/IP';
  private readonly logger = new Logger(BacnetConnector.name);
  private readonly pingClient: BacnetPingClient;

  constructor(pingClient: BacnetPingClient = new UdpBacnetPingClient()) {
    this.pingClient = pingClient;
  }

  /**
   * Validates BACnet integration config JSON.
   */
  validateConfig(config: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const c = config as Partial<BacnetConfig>;

    if (!c.host || typeof c.host !== 'string') {
      errors.push('host is required and must be a string');
    }

    if (c.port !== undefined && (typeof c.port !== 'number' || c.port < 1 || c.port > 65535)) {
      errors.push('port must be a number between 1 and 65535');
    }

    if (c.deviceId === undefined || typeof c.deviceId !== 'number') {
      errors.push('deviceId is required and must be a number');
    } else if (c.deviceId < 0 || c.deviceId > 4_194_303) {
      errors.push('deviceId must be between 0 and 4194303');
    }

    if (c.timeoutMs !== undefined && (typeof c.timeoutMs !== 'number' || c.timeoutMs < 500)) {
      errors.push('timeoutMs must be a number >= 500');
    }

    if (c.deviceProfile !== undefined && typeof c.deviceProfile !== 'string') {
      errors.push('deviceProfile must be a string');
    }

    if (c.meterId !== undefined && typeof c.meterId !== 'string') {
      errors.push('meterId must be a string');
    }

    return errors;
  }

  /**
   * Pings the configured BACnet device (read-only; no property reads in stub).
   */
  async sync(integration: Integration): Promise<SyncResult> {
    const config = integration.config as unknown as BacnetConfig;
    const port = config.port ?? DEFAULT_BACNET_PORT;
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    try {
      const result = await this.pingClient.ping(
        config.host,
        port,
        config.deviceId,
        timeoutMs,
      );

      if (!result.reachable) {
        const msg = result.errorMessage ?? 'BACnet device unreachable';
        this.logger.warn(`[${integration.name}] BACnet ping failed: ${msg}`);
        return { status: 'failed', recordsSynced: 0, errorMessage: msg };
      }

      this.logger.log(
        `[${integration.name}] BACnet ping OK: ${config.host}:${port} deviceId=${config.deviceId}`,
      );
      return { status: 'success', recordsSynced: 1, errorMessage: null };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[${integration.name}] BACnet sync failed: ${msg}`);
      return { status: 'failed', recordsSynced: 0, errorMessage: msg };
    }
  }
}
