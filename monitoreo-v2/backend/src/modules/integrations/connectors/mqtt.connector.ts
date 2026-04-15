import { Logger } from '@nestjs/common';
import type { Integration } from '../../platform/entities/integration.entity';
import type { IntegrationConnector, SyncResult, MqttConfig } from './connector.interface';

/**
 * Connector for MQTT brokers.
 * Connects, subscribes to a topic, collects messages for a window, then disconnects.
 */
export class MqttConnector implements IntegrationConnector {
  readonly type = 'mqtt';
  readonly label = 'MQTT';
  private readonly logger = new Logger(MqttConnector.name);

  /** Sync window in ms — how long to listen for messages. */
  private readonly syncWindowMs: number;

  constructor(syncWindowMs = 5_000) {
    this.syncWindowMs = syncWindowMs;
  }

  validateConfig(config: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const c = config as Partial<MqttConfig>;

    if (!c.brokerUrl || typeof c.brokerUrl !== 'string') {
      errors.push('brokerUrl is required and must be a string');
    } else {
      try {
        const parsed = new URL(c.brokerUrl);
        if (!['mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(parsed.protocol)) {
          errors.push('brokerUrl must use mqtt, mqtts, ws, or wss protocol');
        }
      } catch {
        errors.push('brokerUrl must be a valid URL');
      }
    }

    if (!c.topic || typeof c.topic !== 'string') {
      errors.push('topic is required and must be a string');
    }

    if (c.clientId !== undefined && typeof c.clientId !== 'string') {
      errors.push('clientId must be a string');
    }

    if (c.username !== undefined && typeof c.username !== 'string') {
      errors.push('username must be a string');
    }

    if (c.password !== undefined && typeof c.password !== 'string') {
      errors.push('password must be a string');
    }

    if (c.qos !== undefined && ![0, 1, 2].includes(c.qos)) {
      errors.push('qos must be 0, 1, or 2');
    }

    return errors;
  }

  async sync(integration: Integration): Promise<SyncResult> {
    const config = integration.config as MqttConfig;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mqtt = require('mqtt') as typeof import('mqtt');

    return new Promise<SyncResult>((resolve) => {
      let messageCount = 0;
      let resolved = false;

      const finish = (result: SyncResult) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      const client = mqtt.connect(config.brokerUrl, {
        clientId: config.clientId ?? `em-sync-${integration.id.slice(0, 8)}`,
        username: config.username,
        password: config.password,
        connectTimeout: 10_000,
        clean: true,
      });

      const windowTimer = setTimeout(() => {
        client.end(true);
        this.logger.log(
          `[${integration.name}] MQTT sync: ${messageCount} messages in ${this.syncWindowMs}ms`,
        );
        finish({
          status: 'success',
          recordsSynced: messageCount,
          errorMessage: null,
        });
      }, this.syncWindowMs);

      client.on('connect', () => {
        const qos = config.qos ?? 1;
        client.subscribe(config.topic, { qos }, (err) => {
          if (err) {
            clearTimeout(windowTimer);
            client.end(true);
            const msg = `Subscribe failed: ${err.message}`;
            this.logger.warn(`[${integration.name}] MQTT ${msg}`);
            finish({ status: 'failed', recordsSynced: 0, errorMessage: msg });
          }
        });
      });

      client.on('message', () => {
        messageCount++;
      });

      client.on('error', (err) => {
        clearTimeout(windowTimer);
        client.end(true);
        const msg = `Connection error: ${err.message}`;
        this.logger.warn(`[${integration.name}] MQTT ${msg}`);
        finish({ status: 'failed', recordsSynced: 0, errorMessage: msg });
      });
    });
  }
}
