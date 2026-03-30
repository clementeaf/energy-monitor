import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Building } from './building.entity';
import { Meter } from './meter.entity';
import { Concentrator } from './concentrator.entity';
import { User } from '../../users/entities/user.entity';

export type FaultSeverity = 'critical' | 'high' | 'medium' | 'low';

@Entity('fault_events')
export class FaultEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'building_id' })
  buildingId!: string;

  @ManyToOne(() => Building, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building!: Building;

  @Column({ name: 'meter_id', type: 'uuid', nullable: true })
  meterId!: string | null;

  @ManyToOne(() => Meter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter | null;

  @Column({ name: 'concentrator_id', type: 'uuid', nullable: true })
  concentratorId!: string | null;

  @ManyToOne(() => Concentrator, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'concentrator_id' })
  concentrator!: Concentrator | null;

  @Column({ name: 'fault_type', length: 50 })
  faultType!: string;

  @Column({ length: 20 })
  severity!: FaultSeverity;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolvedByUser!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
