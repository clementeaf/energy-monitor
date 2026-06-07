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
import { User } from '../../users/entities/user.entity';
import type { BuildingImportFileFormat } from '../building-import.types';

export type BuildingImportJobStatus =
  | 'pending_parse'
  | 'ready'
  | 'committing'
  | 'committed'
  | 'failed'
  | 'cancelled';

@Entity('building_import_jobs')
export class BuildingImportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User | null;

  @Column({ name: 'original_filename', length: 255 })
  originalFilename!: string;

  @Column({ name: 'file_format', length: 10 })
  fileFormat!: BuildingImportFileFormat;

  @Column({
    type: 'enum',
    enum: ['pending_parse', 'ready', 'committing', 'committed', 'failed', 'cancelled'],
    enumName: 'user_import_job_status',
    default: 'pending_parse',
  })
  status!: BuildingImportJobStatus;

  @Column({ name: 'total_rows', type: 'integer', default: 0 })
  totalRows!: number;

  @Column({ name: 'valid_rows', type: 'integer', default: 0 })
  validRows!: number;

  @Column({ name: 'error_rows', type: 'integer', default: 0 })
  errorRows!: number;

  @Column({ name: 'duplicate_rows', type: 'integer', default: 0 })
  duplicateRows!: number;

  @Column({ name: 'created_rows', type: 'integer', default: 0 })
  createdRows!: number;

  @Column({ name: 'error_summary', type: 'text', nullable: true })
  errorSummary!: string | null;

  @Column({ name: 'committed_at', type: 'timestamptz', nullable: true })
  committedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
