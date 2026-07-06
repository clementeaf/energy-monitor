import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export type CnrStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
export type CnrMotivo = 'comm_failure' | 'maintenance' | 'replacement' | 'other';

@Entity('cnr_records')
export class CnrRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'meter_id', type: 'uuid' })
  meterId!: string;

  @Column({ name: 'building_id', type: 'uuid' })
  buildingId!: string;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ name: 'value_kwh', type: 'double precision', nullable: true })
  valueKwh!: number | null;

  @Column({ length: 30 })
  motivo!: CnrMotivo;

  @Column({ type: 'text', nullable: true })
  justification!: string | null;

  @Column({ length: 20, default: 'pending' })
  status!: CnrStatus;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
