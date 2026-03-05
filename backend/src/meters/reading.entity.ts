import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Meter } from './meter.entity';

@Entity('readings')
export class Reading {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'meter_id', type: 'varchar', length: 10 })
  meterId!: string;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ name: 'voltage_l1', type: 'numeric', precision: 7, scale: 2, nullable: true })
  voltageL1!: number | null;

  @Column({ name: 'voltage_l2', type: 'numeric', precision: 7, scale: 2, nullable: true })
  voltageL2!: number | null;

  @Column({ name: 'voltage_l3', type: 'numeric', precision: 7, scale: 2, nullable: true })
  voltageL3!: number | null;

  @Column({ name: 'current_l1', type: 'numeric', precision: 8, scale: 3, nullable: true })
  currentL1!: number | null;

  @Column({ name: 'current_l2', type: 'numeric', precision: 8, scale: 3, nullable: true })
  currentL2!: number | null;

  @Column({ name: 'current_l3', type: 'numeric', precision: 8, scale: 3, nullable: true })
  currentL3!: number | null;

  @Column({ name: 'power_kw', type: 'numeric', precision: 10, scale: 3 })
  powerKw!: number;

  @Column({ name: 'reactive_power_kvar', type: 'numeric', precision: 10, scale: 3, nullable: true })
  reactivePowerKvar!: number | null;

  @Column({ name: 'power_factor', type: 'numeric', precision: 5, scale: 3, nullable: true })
  powerFactor!: number | null;

  @Column({ name: 'frequency_hz', type: 'numeric', precision: 6, scale: 3, nullable: true })
  frequencyHz!: number | null;

  @Column({ name: 'energy_kwh_total', type: 'numeric', precision: 14, scale: 3 })
  energyKwhTotal!: number;

  @Column({ name: 'thd_voltage_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
  thdVoltagePct!: number | null;

  @Column({ name: 'thd_current_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
  thdCurrentPct!: number | null;

  @Column({ name: 'phase_imbalance_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
  phaseImbalancePct!: number | null;

  @ManyToOne(() => Meter)
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter;
}
