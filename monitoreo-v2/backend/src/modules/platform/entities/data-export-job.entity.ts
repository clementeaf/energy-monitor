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

export type ExportFormat = 'csv' | 'parquet';
export type ExportJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DataExportJobParams {
  from: string;
  to: string;
  meterId?: string;
  buildingId?: string;
}

@Entity('data_export_jobs')
export class DataExportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({
    type: 'enum',
    enum: ['csv', 'parquet'],
    enumName: 'export_format',
  })
  format!: ExportFormat;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed'],
    enumName: 'export_job_status',
    default: 'pending',
  })
  status!: ExportJobStatus;

  @Column({ type: 'jsonb' })
  params!: DataExportJobParams;

  @Column({ name: 's3_key', type: 'varchar', length: 512, nullable: true })
  s3Key!: string | null;

  @Column({ name: 'local_path', type: 'varchar', length: 512, nullable: true })
  localPath!: string | null;

  @Column({ name: 'row_count', type: 'integer', default: 0 })
  rowCount!: number;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
