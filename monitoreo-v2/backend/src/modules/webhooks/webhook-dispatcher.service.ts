import { createHmac } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookSubscription } from '../platform/entities/webhook-subscription.entity';
import { WebhookDeliveryLog } from '../platform/entities/webhook-delivery-log.entity';
import type { WebhookEventType } from '../../common/constants/webhook-events';
import { decryptConfig, encryptConfig } from '../../common/crypto/config-encryption';
import { validateExternalUrl } from '../../common/security/url-validator';
import { withRetry } from '../integrations/connectors/retry.util';

export interface WebhookDispatchPayload {
  event: WebhookEventType;
  tenantId: string;
  occurredAt: string;
  [key: string]: unknown;
}

export interface WebhookDispatchResult {
  delivered: number;
  failed: number;
}

/**
 * Signs webhook body with HMAC-SHA256 (timestamp + payload).
 */
export function signWebhookPayload(secret: string, timestamp: number, body: string): string {
  const signedContent = `${timestamp}.${body}`;
  return createHmac('sha256', secret).update(signedContent).digest('hex');
}

/**
 * Delivers tenant webhook events with HMAC signing, retries, and audit logging.
 */
@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepo: Repository<WebhookSubscription>,
    @InjectRepository(WebhookDeliveryLog)
    private readonly deliveryLogRepo: Repository<WebhookDeliveryLog>,
  ) {}

  /**
   * Dispatches an event to all active subscriptions for the tenant and event type.
   */
  async dispatch(
    tenantId: string,
    eventType: WebhookEventType,
    payload: WebhookDispatchPayload,
  ): Promise<WebhookDispatchResult> {
    const subscriptions = await this.subscriptionRepo.find({
      where: { tenantId, eventType, active: true },
    });

    if (subscriptions.length === 0) {
      return { delivered: 0, failed: 0 };
    }

    let delivered = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      const ok = await this.deliverOne(subscription, eventType, payload);
      if (ok) delivered += 1;
      else failed += 1;
    }

    return { delivered, failed };
  }

  /**
   * POSTs payload to subscription URL with retries and logs outcome.
   */
  private async deliverOne(
    subscription: WebhookSubscription,
    eventType: WebhookEventType,
    payload: WebhookDispatchPayload,
  ): Promise<boolean> {
    const urlError = validateExternalUrl(subscription.url);
    if (urlError) {
      await this.logDelivery(subscription, eventType, payload, {
        status: 'failed',
        httpStatus: null,
        attemptCount: 0,
        errorMessage: urlError,
      });
      return false;
    }

    const secret = this.decryptSecret(subscription.secret);
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signWebhookPayload(secret, timestamp, body);
    let attemptCount = 0;
    let httpStatus: number | null = null;
    let errorMessage: string | null = null;

    try {
      await withRetry(
        async () => {
          attemptCount += 1;
          const response = await fetch(subscription.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Event': eventType,
              'X-Webhook-Timestamp': String(timestamp),
              'X-Webhook-Signature': `sha256=${signature}`,
            },
            body,
            signal: AbortSignal.timeout(10_000),
          });
          httpStatus = response.status;
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        },
        { maxRetries: 2, delayMs: 500, backoff: true },
      );

      await this.logDelivery(subscription, eventType, payload, {
        status: 'sent',
        httpStatus,
        attemptCount,
        errorMessage: null,
      });
      return true;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[webhook] ${eventType} → ${subscription.url} failed: ${errorMessage}`,
      );
      await this.logDelivery(subscription, eventType, payload, {
        status: 'failed',
        httpStatus,
        attemptCount: attemptCount || 1,
        errorMessage,
      });
      return false;
    }
  }

  /**
   * Persists webhook delivery attempt (GAP-154 audit trail).
   */
  private async logDelivery(
    subscription: WebhookSubscription,
    eventType: WebhookEventType,
    payload: WebhookDispatchPayload,
    outcome: {
      status: 'sent' | 'failed';
      httpStatus: number | null;
      attemptCount: number;
      errorMessage: string | null;
    },
  ): Promise<void> {
    const row = this.deliveryLogRepo.create({
      tenantId: subscription.tenantId,
      subscriptionId: subscription.id,
      eventType,
      url: subscription.url,
      status: outcome.status,
      httpStatus: outcome.httpStatus,
      attemptCount: outcome.attemptCount,
      errorMessage: outcome.errorMessage,
      payload,
    });
    await this.deliveryLogRepo.save(row);
  }

  /**
   * Decrypts stored subscription secret.
   */
  private decryptSecret(stored: string): string {
    const decrypted = decryptConfig({ secret: stored });
    return String(decrypted.secret);
  }
}
