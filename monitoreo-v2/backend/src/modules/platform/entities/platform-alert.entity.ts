import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Building } from './building.entity';
import { Meter } from './meter.entity';
import { AlertRule } from './alert-rule.entity';
import { User } from '../../users/entities/user.entity';

export type PlatformAlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type PlatformAlertStatus = 'active' | 'acknowledged' | 'resolved';

@Entity('alerts')
export class PlatformAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'alert_rule_id', type: 'uuid', nullable: true })
  alertRuleId!: string | null;

  @ManyToOne(() => AlertRule, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'alert_rule_id' })
  alertRule!: AlertRule | null;

  @Column({ name: 'building_id' })
  buildingId!: string;

  @ManyToOne(() => Building, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building!: Building;

  @Column({ name: 'meter_id', type: 'uuid', nullable: true })
  meterId!: string | null;

  @ManyToOne(() => Meter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter | null;

  @Column({ name: 'alert_type_code', length: 50 })
  alertTypeCode!: string;

  @Column({ length: 20 })
  severity!: PlatformAlertSeverity;

  @Column({ length: 20, default: 'active' })
  status!: PlatformAlertStatus;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'triggered_value', type: 'double precision', nullable: true })
  triggeredValue!: number | null;

  @Column({ name: 'threshold_value', type: 'double precision', nullable: true })
  thresholdValue!: number | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedToUser!: User | null;

  @Column({ name: 'acknowledged_by', type: 'uuid', nullable: true })
  acknowledgedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'acknowledged_by' })
  acknowledgedByUser!: User | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolvedByUser!: User | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
