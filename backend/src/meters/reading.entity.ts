import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Meter } from './meter.entity';

@Entity('readings')
export class Reading {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'M001' })
  @Column({ name: 'meter_id', type: 'varchar', length: 10 })
  meterId!: string;

  @ApiProperty({ example: '2026-03-06T14:32:00.000Z' })
  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @ApiProperty({ example: 230.15, nullable: true })
  @Column({ name: 'voltage_l1', type: 'numeric', precision: 7, scale: 2, nullable: true })
  voltageL1!: number | null;

  @ApiProperty({ example: 229.87, nullable: true })
  @Column({ name: 'voltage_l2', type: 'numeric', precision: 7, scale: 2, nullable: true })
  voltageL2!: number | null;

  @ApiProperty({ example: 230.42, nullable: true })
  @Column({ name: 'voltage_l3', type: 'numeric', precision: 7, scale: 2, nullable: true })
  voltageL3!: number | null;

  @ApiProperty({ example: 12.345, nullable: true })
  @Column({ name: 'current_l1', type: 'numeric', precision: 8, scale: 3, nullable: true })
  currentL1!: number | null;

  @ApiProperty({ example: 11.892, nullable: true })
  @Column({ name: 'current_l2', type: 'numeric', precision: 8, scale: 3, nullable: true })
  currentL2!: number | null;

  @ApiProperty({ example: 12.103, nullable: true })
  @Column({ name: 'current_l3', type: 'numeric', precision: 8, scale: 3, nullable: true })
  currentL3!: number | null;

  @ApiProperty({ example: 8.456 })
  @Column({ name: 'power_kw', type: 'numeric', precision: 10, scale: 3 })
  powerKw!: number;

  @ApiProperty({ example: 1.234, nullable: true })
  @Column({ name: 'reactive_power_kvar', type: 'numeric', precision: 10, scale: 3, nullable: true })
  reactivePowerKvar!: number | null;

  @ApiProperty({ example: 0.95, nullable: true })
  @Column({ name: 'power_factor', type: 'numeric', precision: 5, scale: 3, nullable: true })
  powerFactor!: number | null;

  @ApiProperty({ example: 50.001, nullable: true })
  @Column({ name: 'frequency_hz', type: 'numeric', precision: 6, scale: 3, nullable: true })
  frequencyHz!: number | null;

  @ApiProperty({ example: 12345.678 })
  @Column({ name: 'energy_kwh_total', type: 'numeric', precision: 14, scale: 3 })
  energyKwhTotal!: number;

  @ApiProperty({ example: 2.34, nullable: true })
  @Column({ name: 'thd_voltage_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
  thdVoltagePct!: number | null;

  @ApiProperty({ example: 5.67, nullable: true })
  @Column({ name: 'thd_current_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
  thdCurrentPct!: number | null;

  @ApiProperty({ example: 1.23, nullable: true })
  @Column({ name: 'phase_imbalance_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
  phaseImbalancePct!: number | null;

  @ManyToOne(() => Meter)
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter;
}
