import { Logger } from '@nestjs/common';
import type { Integration } from '../../platform/entities/integration.entity';
import type { IntegrationConnector, SyncResult, SnmpConfig } from './connector.interface';
import {
  SNMP_PING_OID,
  UdpSnmpPingClient,
  type SnmpPingClient,
} from './snmp-ping.client';
import { withRetry } from './retry.util';

const DEFAULT_SNMP_PORT = 161;
const DEFAULT_TIMEOUT_MS = 6_000;

/**
 * Read-only SNMP connector — validates config and pings agent via GET sysUpTime.
 */
export class SnmpConnector implements IntegrationConnector {
  readonly type = 'snmp';
  readonly label = 'SNMP';
  private readonly logger = new Logger(SnmpConnector.name);
  private readonly pingClient: SnmpPingClient;

  constructor(pingClient: SnmpPingClient = new UdpSnmpPingClient()) {
    this.pingClient = pingClient;
  }

  /**
   * Validates SNMP integration config JSON.
   */
  validateConfig(config: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const c = config as Partial<SnmpConfig>;

    if (!c.host || typeof c.host !== 'string') {
      errors.push('host is required and must be a string');
    }

    if (c.port !== undefined && (typeof c.port !== 'number' || c.port < 1 || c.port > 65535)) {
      errors.push('port must be a number between 1 and 65535');
    }

    if (typeof c.community !== 'string' || c.community.length === 0) {
      if (typeof c.community === 'string' && c.community.length === 0) {
        errors.push('community must not be empty');
      } else {
        errors.push('community is required and must be a string');
      }
    }

    if (c.version !== undefined && c.version !== '1' && c.version !== '2c') {
      errors.push('version must be "1" or "2c"');
    }

    if (c.timeoutMs !== undefined && (typeof c.timeoutMs !== 'number' || c.timeoutMs < 500)) {
      errors.push('timeoutMs must be a number >= 500');
    }

    if (c.pingOid !== undefined && typeof c.pingOid !== 'string') {
      errors.push('pingOid must be a string');
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
   * Pings the configured SNMP agent (read-only; no OID poll beyond ping OID).
   */
  async sync(integration: Integration): Promise<SyncResult> {
    const config = integration.config as unknown as SnmpConfig;
    const port = config.port ?? DEFAULT_SNMP_PORT;
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const oid = config.pingOid ?? SNMP_PING_OID;

    if (config.version === '1') {
      return {
        status: 'failed',
        recordsSynced: 0,
        errorMessage: 'SNMPv1 ping not implemented in stub; use version 2c',
      };
    }

    try {
      const result = await withRetry(
        () => this.pingClient.ping(config.host, port, config.community, oid, timeoutMs),
        { maxRetries: 2, delayMs: 1000 },
      );

      if (!result.reachable) {
        const msg = result.errorMessage ?? 'SNMP agent unreachable';
        this.logger.warn(`[${integration.name}] SNMP ping failed: ${msg}`);
        return { status: 'failed', recordsSynced: 0, errorMessage: msg };
      }

      this.logger.log(`[${integration.name}] SNMP ping OK: ${config.host}:${port}`);
      return { status: 'success', recordsSynced: 1, errorMessage: null };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[${integration.name}] SNMP sync failed: ${msg}`);
      return { status: 'failed', recordsSynced: 0, errorMessage: msg };
    }
  }
}
