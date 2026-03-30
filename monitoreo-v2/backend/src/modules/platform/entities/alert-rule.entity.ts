import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Building } from './building.entity';
import { User } from '../../users/entities/user.entity';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'building_id', type: 'uuid', nullable: true })
  buildingId!: string | null;

  @ManyToOne(() => Building, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'building_id' })
  building!: Building | null;

  @Column({ name: 'alert_type_code', length: 50 })
  alertTypeCode!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ length: 20 })
  severity!: AlertSeverity;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'check_interval_seconds', type: 'integer', default: 900 })
  checkIntervalSeconds!: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config!: Record<string, unknown>;

  @Column({ name: 'escalation_l1_minutes', type: 'integer', default: 0 })
  escalationL1Minutes!: number;

  @Column({ name: 'escalation_l2_minutes', type: 'integer', default: 60 })
  escalationL2Minutes!: number;

  @Column({ name: 'escalation_l3_minutes', type: 'integer', default: 1440 })
  escalationL3Minutes!: number;

  @Column({ name: 'notify_email', default: true })
  notifyEmail!: boolean;

  @Column({ name: 'notify_push', default: false })
  notifyPush!: boolean;

  @Column({ name: 'notify_whatsapp', default: false })
  notifyWhatsapp!: boolean;

  @Column({ name: 'notify_sms', default: false })
  notifySms!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
