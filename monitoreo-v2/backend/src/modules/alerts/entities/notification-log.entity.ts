import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { PlatformAlert } from '../../platform/entities/platform-alert.entity';

export type NotificationChannel = 'email' | 'webhook' | 'push' | 'whatsapp' | 'sms';
export type NotificationStatus = 'sent' | 'failed' | 'pending';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'alert_id' })
  alertId!: string;

  @ManyToOne(() => PlatformAlert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert!: PlatformAlert;

  @Column({ length: 20 })
  channel!: NotificationChannel;

  @Column({ length: 20, default: 'sent' })
  status!: NotificationStatus;

  @Column({ type: 'text', nullable: true })
  recipient!: string | null;

  @Column({ type: 'text' })
  subject!: string;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
