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
import type { ReportFormat } from './report.entity';

@Entity('scheduled_reports')
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'building_id', type: 'uuid', nullable: true })
  buildingId!: string | null;

  @ManyToOne(() => Building, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'building_id' })
  building!: Building | null;

  @Column({ name: 'report_type', length: 50 })
  reportType!: string;

  @Column({ length: 10 })
  format!: ReportFormat;

  @Column({ name: 'cron_expression', length: 100 })
  cronExpression!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  recipients!: string[];

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt!: Date | null;

  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt!: Date | null;

  @Column({ name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
