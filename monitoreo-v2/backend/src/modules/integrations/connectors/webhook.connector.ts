import { Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import type { Integration } from '../../platform/entities/integration.entity';
import type { IntegrationConnector, SyncResult, WebhookConfig } from './connector.interface';
import { withRetry } from './retry.util';

/**
 * Connector for outbound webhooks.
 * Sends a POST to the configured URL with optional HMAC-SHA256 signature.
 */
export class WebhookConnector implements IntegrationConnector {
  readonly type = 'webhook';
  readonly label = 'Webhook';
  private readonly logger = new Logger(WebhookConnector.name);

  validateConfig(config: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const c = config as Partial<WebhookConfig>;

    if (!c.url || typeof c.url !== 'string') {
      errors.push('url is required and must be a string');
    } else {
      try {
        const parsed = new URL(c.url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errors.push('url must use http or https protocol');
        }
      } catch {
        errors.push('url must be a valid URL');
      }
    }

    if (c.secret !== undefined && typeof c.secret !== 'string') {
      errors.push('secret must be a string');
    }

    if (c.headers !== undefined && (typeof c.headers !== 'object' || Array.isArray(c.headers))) {
      errors.push('headers must be a key-value object');
    }

    if (c.events !== undefined) {
      if (!Array.isArray(c.events)) {
        errors.push('events must be an array of strings');
      } else if (c.events.some((e) => typeof e !== 'string')) {
        errors.push('events must contain only strings');
      }
    }

    if (c.timeoutMs !== undefined && (typeof c.timeoutMs !== 'number' || c.timeoutMs < 1000)) {
      errors.push('timeoutMs must be a number >= 1000');
    }

    return errors;
  }

  async sync(integration: Integration): Promise<SyncResult> {
    const config = integration.config as WebhookConfig;
    const timeoutMs = config.timeoutMs ?? 10_000;

    const payload = {
      event: 'sync.test',
      integrationId: integration.id,
      timestamp: new Date().toISOString(),
    };

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (config.secret) {
      headers['X-Webhook-Signature'] = this.sign(body, config.secret);
    }

    try {
      await withRetry(
        () => this.doPost(config.url, headers, body, timeoutMs),
        { maxRetries: 2, delayMs: 500 },
      );

      this.logger.log(`[${integration.name}] Webhook delivered to ${config.url}`);
      return { status: 'success', recordsSynced: 1, errorMessage: null };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[${integration.name}] Webhook delivery failed: ${msg}`);
      return { status: 'failed', recordsSynced: 0, errorMessage: msg };
    }
  }

  /* ------------------------------------------------------------------ */

  private sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  private async doPost(
    url: string,
    headers: Record<string, string>,
    body: string,
    timeoutMs: number,
  ): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
