import { Logger } from '@nestjs/common';
import type { Integration } from '../../platform/entities/integration.entity';
import type { IntegrationConnector, SyncResult, RestApiConfig } from './connector.interface';
import { withRetry } from './retry.util';
import { validateExternalUrl } from '../../../common/security/url-validator';

/**
 * Connector for external REST APIs.
 * Fetches data from a configured URL, optionally with auth headers.
 */
export class RestApiConnector implements IntegrationConnector {
  readonly type = 'rest_api';
  readonly label = 'REST API';
  private readonly logger = new Logger(RestApiConnector.name);

  validateConfig(config: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const c = config as Partial<RestApiConfig>;

    if (!c.url || typeof c.url !== 'string') {
      errors.push('url is required and must be a string');
    } else {
      const ssrfError = validateExternalUrl(c.url);
      if (ssrfError) {
        errors.push(ssrfError);
      }
    }

    if (c.method !== undefined && c.method !== 'GET' && c.method !== 'POST') {
      errors.push('method must be GET or POST');
    }

    if (c.headers !== undefined && (typeof c.headers !== 'object' || Array.isArray(c.headers))) {
      errors.push('headers must be a key-value object');
    }

    if (c.auth !== undefined) {
      if (typeof c.auth !== 'object' || Array.isArray(c.auth)) {
        errors.push('auth must be an object');
      } else {
        const validTypes = ['bearer', 'basic', 'api_key'];
        if (!validTypes.includes(c.auth.type)) {
          errors.push(`auth.type must be one of: ${validTypes.join(', ')}`);
        }
        if (c.auth.type === 'bearer' && !c.auth.token) {
          errors.push('auth.token is required for bearer auth');
        }
        if (c.auth.type === 'basic' && (!c.auth.username || !c.auth.password)) {
          errors.push('auth.username and auth.password are required for basic auth');
        }
        if (c.auth.type === 'api_key' && !c.auth.apiKey) {
          errors.push('auth.apiKey is required for api_key auth');
        }
      }
    }

    if (c.timeoutMs !== undefined && (typeof c.timeoutMs !== 'number' || c.timeoutMs < 1000)) {
      errors.push('timeoutMs must be a number >= 1000');
    }

    return errors;
  }

  async sync(integration: Integration): Promise<SyncResult> {
    const config = integration.config as RestApiConfig;
    const method = config.method ?? 'GET';
    const timeoutMs = config.timeoutMs ?? 30_000;

    const headers: Record<string, string> = { ...config.headers };
    this.applyAuth(headers, config);

    const startMs = Date.now();
    try {
      const response = await withRetry(
        () => this.doFetch(config.url, method, headers, config.body, timeoutMs),
        { maxRetries: 2, delayMs: 1000 },
      );

      const elapsed = Date.now() - startMs;
      const recordsSynced = this.extractRecordCount(response, config.responseMapping);
      this.logger.log(
        `[${integration.name}] REST sync OK: ${recordsSynced} records in ${elapsed}ms`,
      );

      return { status: 'success', recordsSynced, errorMessage: null };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[${integration.name}] REST sync failed: ${msg}`);
      return { status: 'failed', recordsSynced: 0, errorMessage: msg };
    }
  }

  /* ------------------------------------------------------------------ */

  private applyAuth(headers: Record<string, string>, config: RestApiConfig): void {
    if (!config.auth) return;

    switch (config.auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${config.auth.token}`;
        break;
      case 'basic': {
        const encoded = Buffer.from(
          `${config.auth.username}:${config.auth.password}`,
        ).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
        break;
      }
      case 'api_key': {
        const headerName = config.auth.headerName ?? 'X-API-Key';
        headers[headerName] = config.auth.apiKey!;
        break;
      }
    }
  }

  private async doFetch(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Record<string, unknown> | undefined,
    timeoutMs: number,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const init: RequestInit = {
        method,
        headers: { 'Accept': 'application/json', ...headers },
        signal: controller.signal,
      };

      if (method === 'POST' && body) {
        init.body = JSON.stringify(body);
        (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, init);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  private extractRecordCount(
    data: unknown,
    mapping?: RestApiConfig['responseMapping'],
  ): number {
    if (!mapping) {
      return Array.isArray(data) ? data.length : 1;
    }

    if (mapping.countPath) {
      const count = this.getNestedValue(data, mapping.countPath);
      if (typeof count === 'number') return count;
    }

    if (mapping.dataPath) {
      const arr = this.getNestedValue(data, mapping.dataPath);
      if (Array.isArray(arr)) return arr.length;
    }

    return Array.isArray(data) ? data.length : 1;
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }
}
