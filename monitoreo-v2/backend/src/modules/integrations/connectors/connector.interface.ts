import { Integration } from '../../platform/entities/integration.entity';

/**
 * Result of a connector sync operation.
 */
export interface SyncResult {
  readonly status: 'success' | 'partial' | 'failed';
  readonly recordsSynced: number;
  readonly errorMessage: string | null;
}

/**
 * Strategy interface for integration connectors.
 * Each supported integrationType has a concrete implementation.
 */
export interface IntegrationConnector {
  /** Unique type identifier (must match integrationType column). */
  readonly type: string;

  /** Human-readable label for UI display. */
  readonly label: string;

  /** Validate integration config. Returns array of error strings (empty = valid). */
  validateConfig(config: Record<string, unknown>): string[];

  /** Execute a sync operation against the external system. */
  sync(integration: Integration): Promise<SyncResult>;
}

/* ------------------------------------------------------------------ */
/*  Per-connector config shapes (for documentation and validation)     */
/* ------------------------------------------------------------------ */

export interface RestApiConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    headerName?: string;
    apiKey?: string;
  };
  body?: Record<string, unknown>;
  responseMapping?: {
    dataPath?: string;
    countPath?: string;
  };
  timeoutMs?: number;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  events?: string[];
  timeoutMs?: number;
}

export interface MqttConfig {
  brokerUrl: string;
  topic: string;
  clientId?: string;
  username?: string;
  password?: string;
  qos?: 0 | 1 | 2;
}

export interface FtpConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  remotePath?: string;
  secure?: boolean;
  filePattern?: string;
}

/** All supported integration type keys. */
export const SUPPORTED_INTEGRATION_TYPES = [
  'rest_api',
  'webhook',
  'mqtt',
  'ftp',
] as const;

export type IntegrationTypeKey = (typeof SUPPORTED_INTEGRATION_TYPES)[number];
