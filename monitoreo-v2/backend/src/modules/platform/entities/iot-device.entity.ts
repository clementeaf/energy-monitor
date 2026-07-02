import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Meter } from './meter.entity';

@Entity('iot_devices')
export class IotDevice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'device_client_id', type: 'varchar', length: 255, unique: true })
  deviceClientId!: string;

  @Column({ name: 'first_seen', type: 'timestamptz' })
  firstSeen!: Date;

  @Column({ name: 'last_seen', type: 'timestamptz' })
  lastSeen!: Date;

  @Column({ name: 'assigned_meter_id', type: 'uuid', nullable: true })
  assignedMeterId!: string | null;

  @ManyToOne(() => Meter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_meter_id' })
  assignedMeter!: Meter | null;

  @Column({ name: 'payload_sample', type: 'jsonb', default: () => "'{}'" })
  payloadSample!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
