import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Building } from './building.entity';

export type MeterPhaseType = 'single_phase' | 'three_phase';
export type MeterDiStatus = 'closed' | 'open' | 'unknown';
export type MeterDoStatus = 'active' | 'inactive' | 'error';

@Entity('meters')
@Unique(['tenantId', 'code'])
export class Meter {
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
  code!: string;

  @Column({ name: 'meter_type', length: 50, default: 'electrical' })
  meterType!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @Column({ name: 'external_id', type: 'varchar', length: 100, nullable: true })
  externalId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model!: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  serialNumber!: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'modbus_address', type: 'smallint', nullable: true })
  modbusAddress!: number | null;

  @Column({ name: 'bus_id', type: 'varchar', length: 100, nullable: true })
  busId!: string | null;

  @Column({ name: 'phase_type', length: 20, default: 'three_phase' })
  phaseType!: MeterPhaseType;

  @Column({ name: 'di_status', length: 20, default: 'closed' })
  diStatus!: MeterDiStatus;

  @Column({ name: 'do_status', length: 20, default: 'inactive' })
  doStatus!: MeterDoStatus;

  @Column({ name: 'uplink_route', type: 'varchar', length: 50, nullable: true })
  uplinkRoute!: string | null;

  @Column({ name: 'crc_errors_last_poll', type: 'integer', default: 0 })
  crcErrorsLastPoll!: number;

  @Column({ name: 'nominal_voltage', type: 'decimal', precision: 8, scale: 2, nullable: true })
  nominalVoltage!: string | null;

  @Column({ name: 'nominal_current', type: 'decimal', precision: 8, scale: 2, nullable: true })
  nominalCurrent!: string | null;

  @Column({ name: 'contracted_demand_kw', type: 'decimal', precision: 10, scale: 2, nullable: true })
  contractedDemandKw!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
