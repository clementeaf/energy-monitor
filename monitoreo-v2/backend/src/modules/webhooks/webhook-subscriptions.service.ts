import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookSubscription } from '../platform/entities/webhook-subscription.entity';
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto';
import { UpdateWebhookSubscriptionDto } from './dto/update-webhook-subscription.dto';
import { encryptConfig } from '../../common/crypto/config-encryption';
import { validateExternalUrl } from '../../common/security/url-validator';
import type { WebhookEventType } from '../../common/constants/webhook-events';

export interface WebhookSubscriptionResponse {
  id: string;
  tenantId: string;
  eventType: WebhookEventType;
  url: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CRUD for tenant webhook subscriptions (GAP-152).
 */
@Injectable()
export class WebhookSubscriptionsService {
  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepo: Repository<WebhookSubscription>,
  ) {}

  /**
   * Lists subscriptions for a tenant with optional filters.
   */
  async findAll(
    tenantId: string,
    filters?: { eventType?: string; active?: string },
  ): Promise<WebhookSubscriptionResponse[]> {
    const qb = this.subscriptionRepo
      .createQueryBuilder('w')
      .where('w.tenant_id = :tenantId', { tenantId })
      .orderBy('w.event_type', 'ASC')
      .addOrderBy('w.created_at', 'ASC');

    if (filters?.eventType) {
      qb.andWhere('w.event_type = :eventType', { eventType: filters.eventType });
    }

    if (filters?.active === 'true') {
      qb.andWhere('w.active = true');
    } else if (filters?.active === 'false') {
      qb.andWhere('w.active = false');
    }

    const rows = await qb.getMany();
    return rows.map((row) => this.toResponse(row));
  }

  /**
   * Returns one subscription by id scoped to tenant.
   */
  async findOne(id: string, tenantId: string): Promise<WebhookSubscriptionResponse | null> {
    const row = await this.subscriptionRepo.findOneBy({ id, tenantId });
    return row ? this.toResponse(row) : null;
  }

  /**
   * Creates a webhook subscription with encrypted secret.
   */
  async create(
    tenantId: string,
    dto: CreateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionResponse> {
    this.assertValidUrl(dto.url);

    const row = this.subscriptionRepo.create({
      tenantId,
      eventType: dto.eventType as WebhookEventType,
      url: dto.url,
      secret: this.encryptSecret(dto.secret),
      active: dto.active ?? true,
    });
    const saved = await this.subscriptionRepo.save(row);
    return this.toResponse(saved);
  }

  /**
   * Updates subscription fields for tenant.
   */
  async update(
    id: string,
    tenantId: string,
    dto: UpdateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionResponse | null> {
    const row = await this.subscriptionRepo.findOneBy({ id, tenantId });
    if (!row) return null;

    if (dto.url !== undefined) {
      this.assertValidUrl(dto.url);
      row.url = dto.url;
    }
    if (dto.eventType !== undefined) {
      row.eventType = dto.eventType as WebhookEventType;
    }
    if (dto.secret !== undefined) {
      row.secret = this.encryptSecret(dto.secret);
    }
    if (dto.active !== undefined) {
      row.active = dto.active;
    }

    const saved = await this.subscriptionRepo.save(row);
    return this.toResponse(saved);
  }

  /**
   * Deletes a subscription.
   */
  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.subscriptionRepo.delete({ id, tenantId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Counts active subscriptions for tenant (health endpoint).
   */
  async countActive(tenantId: string): Promise<number> {
    return this.subscriptionRepo.count({ where: { tenantId, active: true } });
  }

  /**
   * Validates external URL and throws 400 on SSRF risk.
   */
  private assertValidUrl(url: string): void {
    const error = validateExternalUrl(url);
    if (error) {
      throw new BadRequestException(error);
    }
  }

  /**
   * Encrypts webhook signing secret at rest.
   */
  private encryptSecret(secret: string): string {
    return String(encryptConfig({ secret }).secret);
  }

  /**
   * Maps entity to API response without secret.
   */
  private toResponse(row: WebhookSubscription): WebhookSubscriptionResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      eventType: row.eventType,
      url: row.url,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
