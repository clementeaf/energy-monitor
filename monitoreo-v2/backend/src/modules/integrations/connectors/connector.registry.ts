import { Injectable, BadRequestException } from '@nestjs/common';
import type { IntegrationConnector } from './connector.interface';
import { SUPPORTED_INTEGRATION_TYPES } from './connector.interface';
import { RestApiConnector } from './rest-api.connector';
import { WebhookConnector } from './webhook.connector';
import { MqttConnector } from './mqtt.connector';
import { FtpConnector } from './ftp.connector';

/**
 * Registry that maps integrationType strings to connector instances.
 * Central entry point for the strategy pattern.
 */
@Injectable()
export class ConnectorRegistry {
  private readonly connectors: ReadonlyMap<string, IntegrationConnector>;

  constructor() {
    const list: IntegrationConnector[] = [
      new RestApiConnector(),
      new WebhookConnector(),
      new MqttConnector(),
      new FtpConnector(),
    ];

    this.connectors = new Map(list.map((c) => [c.type, c]));
  }

  /** Get a connector by type. Throws if unsupported. */
  get(type: string): IntegrationConnector {
    const connector = this.connectors.get(type);
    if (!connector) {
      throw new BadRequestException(
        `Unsupported integration type: '${type}'. Supported: ${SUPPORTED_INTEGRATION_TYPES.join(', ')}`,
      );
    }
    return connector;
  }

  /** Check if a type is supported. */
  has(type: string): boolean {
    return this.connectors.has(type);
  }

  /** List all supported types with labels. */
  listTypes(): Array<{ type: string; label: string }> {
    return Array.from(this.connectors.values()).map((c) => ({
      type: c.type,
      label: c.label,
    }));
  }

  /** Validate config for a specific integration type. Returns error strings. */
  validateConfig(type: string, config: Record<string, unknown>): string[] {
    const connector = this.get(type);
    return connector.validateConfig(config);
  }
}
