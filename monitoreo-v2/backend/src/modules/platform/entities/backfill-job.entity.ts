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
import { Meter } from './meter.entity';

export type BackfillJobStatus = 'pending' | 'running' | 'completed' | 'failed';

@Entity('backfill_jobs')
export class BackfillJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'meter_id' })
  meterId!: string;

  @ManyToOne(() => Meter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter;

  @Column({ name: 'from_ts', type: 'timestamptz' })
  fromTs!: Date;

  @Column({ name: 'to_ts', type: 'timestamptz' })
  toTs!: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed'],
    enumName: 'backfill_job_status',
    default: 'pending',
  })
  status!: BackfillJobStatus;

  @Column({ name: 'rows_inserted', type: 'integer', default: 0 })
  rowsInserted!: number;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
