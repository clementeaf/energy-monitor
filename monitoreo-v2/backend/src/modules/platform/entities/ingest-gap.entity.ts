import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Meter } from './meter.entity';

export type IngestGapStatus = 'open' | 'resolved';

@Entity('ingest_gaps')
export class IngestGap {
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

  @Column({ name: 'gap_start', type: 'timestamptz' })
  gapStart!: Date;

  @Column({ name: 'gap_end', type: 'timestamptz' })
  gapEnd!: Date;

  @CreateDateColumn({ name: 'detected_at', type: 'timestamptz' })
  detectedAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'enum', enum: ['open', 'resolved'], enumName: 'ingest_gap_status', default: 'open' })
  status!: IngestGapStatus;
}
