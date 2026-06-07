import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { WebhookSubscription } from './webhook-subscription.entity';
import type { WebhookEventType } from '../../../common/constants/webhook-events';

export type WebhookDeliveryStatus = 'sent' | 'failed';

@Entity('webhook_delivery_logs')
export class WebhookDeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId!: string | null;

  @ManyToOne(() => WebhookSubscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: WebhookSubscription | null;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType!: WebhookEventType;

  @Column({ type: 'text' })
  url!: string;

  @Column({ length: 20 })
  status!: WebhookDeliveryStatus;

  @Column({ name: 'http_status', type: 'integer', nullable: true })
  httpStatus!: number | null;

  @Column({ name: 'attempt_count', type: 'integer', default: 1 })
  attemptCount!: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
