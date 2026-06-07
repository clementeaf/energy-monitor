import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Meter } from './meter.entity';

@Entity('meter_reading_status')
export class MeterReadingStatus {
  @PrimaryColumn({ name: 'meter_id' })
  meterId!: string;

  @ManyToOne(() => Meter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'last_reading_at', type: 'timestamptz', nullable: true })
  lastReadingAt!: Date | null;

  @Column({ name: 'last_ingested_at', type: 'timestamptz', nullable: true })
  lastIngestedAt!: Date | null;

  @Column({ name: 'last_source', type: 'varchar', length: 30, nullable: true })
  lastSource!: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
