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
import { Building } from './building.entity';

export type ConcentratorStatus = 'online' | 'offline' | 'error' | 'maintenance';

@Entity('concentrators')
export class Concentrator {
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

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 100 })
  model!: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  serialNumber!: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'firmware_version', type: 'varchar', length: 50, nullable: true })
  firmwareVersion!: string | null;

  @Column({ length: 20, default: 'online' })
  status!: ConcentratorStatus;

  @Column({ name: 'last_heartbeat_at', type: 'timestamptz', nullable: true })
  lastHeartbeatAt!: Date | null;

  @Column({ name: 'mqtt_connected', default: false })
  mqttConnected!: boolean;

  @Column({ name: 'battery_level', type: 'smallint', nullable: true })
  batteryLevel!: number | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
