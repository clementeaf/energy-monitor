import {
  Entity,
  Column,
  PrimaryColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('etl_watermarks')
export class EtlWatermark {
  @PrimaryColumn({ name: 'consumer_id', length: 100 })
  consumerId!: string;

  @PrimaryColumn({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @PrimaryColumn({ length: 50, default: 'readings' })
  stream!: string;

  @Column({ name: 'last_cursor', type: 'text' })
  lastCursor!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
