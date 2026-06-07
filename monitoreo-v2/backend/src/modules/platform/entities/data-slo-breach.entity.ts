import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('data_slo_breaches')
export class DataSloBreach {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'slo_type', length: 50 })
  sloType!: string;

  @CreateDateColumn({ name: 'breached_at', type: 'timestamptz' })
  breachedAt!: Date;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  detail!: Record<string, unknown>;
}
