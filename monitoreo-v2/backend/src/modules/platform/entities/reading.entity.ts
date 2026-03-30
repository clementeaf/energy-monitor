import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Meter } from './meter.entity';

@Entity('readings')
@Index('idx_readings_meter_ts', ['meterId', 'timestamp'])
@Index('idx_readings_tenant_ts', ['tenantId', 'timestamp'])
export class Reading {
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

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  // --- Electrical measurements ---

  @Column({ name: 'voltage_l1', type: 'decimal', precision: 7, scale: 2, nullable: true })
  voltageL1!: string | null;

  @Column({ name: 'voltage_l2', type: 'decimal', precision: 7, scale: 2, nullable: true })
  voltageL2!: string | null;

  @Column({ name: 'voltage_l3', type: 'decimal', precision: 7, scale: 2, nullable: true })
  voltageL3!: string | null;

  @Column({ name: 'current_l1', type: 'decimal', precision: 8, scale: 3, nullable: true })
  currentL1!: string | null;

  @Column({ name: 'current_l2', type: 'decimal', precision: 8, scale: 3, nullable: true })
  currentL2!: string | null;

  @Column({ name: 'current_l3', type: 'decimal', precision: 8, scale: 3, nullable: true })
  currentL3!: string | null;

  @Column({ name: 'power_kw', type: 'decimal', precision: 10, scale: 3 })
  powerKw!: string;

  @Column({ name: 'reactive_power_kvar', type: 'decimal', precision: 10, scale: 3, nullable: true })
  reactivePowerKvar!: string | null;

  @Column({ name: 'power_factor', type: 'decimal', precision: 5, scale: 3, nullable: true })
  powerFactor!: string | null;

  @Column({ name: 'frequency_hz', type: 'decimal', precision: 6, scale: 3, nullable: true })
  frequencyHz!: string | null;

  @Column({ name: 'energy_kwh_total', type: 'decimal', precision: 14, scale: 3 })
  energyKwhTotal!: string;

  // --- Quality metrics ---

  @Column({ name: 'thd_voltage_pct', type: 'decimal', precision: 5, scale: 2, nullable: true })
  thdVoltagePct!: string | null;

  @Column({ name: 'thd_current_pct', type: 'decimal', precision: 5, scale: 2, nullable: true })
  thdCurrentPct!: string | null;

  @Column({ name: 'phase_imbalance_pct', type: 'decimal', precision: 5, scale: 2, nullable: true })
  phaseImbalancePct!: string | null;

  // --- Digital I/O & status ---

  @Column({ name: 'breaker_status', type: 'varchar', length: 10, nullable: true })
  breakerStatus!: string | null;

  @Column({ name: 'digital_input_1', type: 'smallint', nullable: true })
  digitalInput1!: number | null;

  @Column({ name: 'digital_input_2', type: 'smallint', nullable: true })
  digitalInput2!: number | null;

  @Column({ name: 'digital_output_1', type: 'smallint', nullable: true })
  digitalOutput1!: number | null;

  @Column({ name: 'digital_output_2', type: 'smallint', nullable: true })
  digitalOutput2!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  alarm!: string | null;

  @Column({ name: 'modbus_crc_errors', type: 'integer', nullable: true })
  modbusCrcErrors!: number | null;
}
