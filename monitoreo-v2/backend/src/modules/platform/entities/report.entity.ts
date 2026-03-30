import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Building } from './building.entity';
import { User } from '../../users/entities/user.entity';

export type PlatformReportType =
  | 'executive'
  | 'consumption'
  | 'demand'
  | 'billing'
  | 'sla'
  | 'esg'
  | 'benchmark'
  | 'inventory'
  | 'alerts_compliance';

export type ReportFormat = 'pdf' | 'excel' | 'csv';

@Entity('reports')
export class Report {
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
  reportType!: PlatformReportType;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ length: 10 })
  format!: ReportFormat;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl!: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes!: string | null;

  @Column({ name: 'generated_by' })
  generatedBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'generated_by' })
  generatedByUser!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
