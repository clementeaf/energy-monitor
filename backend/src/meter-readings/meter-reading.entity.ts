import { Entity, Column, PrimaryColumn, ValueTransformer } from 'typeorm';

const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('meter_readings')
export class MeterReading {
  @PrimaryColumn({ type: 'varchar', length: 10, name: 'meter_id' })
  meterId!: string;

  @PrimaryColumn({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ type: 'numeric', precision: 7, scale: 2, name: 'voltage_l1', nullable: true, transformer: numericTransformer })
  voltageL1!: number | null;

  @Column({ type: 'numeric', precision: 7, scale: 2, name: 'voltage_l2', nullable: true, transformer: numericTransformer })
  voltageL2!: number | null;

  @Column({ type: 'numeric', precision: 7, scale: 2, name: 'voltage_l3', nullable: true, transformer: numericTransformer })
  voltageL3!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 3, name: 'current_l1', nullable: true, transformer: numericTransformer })
  currentL1!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 3, name: 'current_l2', nullable: true, transformer: numericTransformer })
  currentL2!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 3, name: 'current_l3', nullable: true, transformer: numericTransformer })
  currentL3!: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 3, name: 'power_kw', nullable: true, transformer: numericTransformer })
  powerKw!: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 3, name: 'reactive_power_kvar', nullable: true, transformer: numericTransformer })
  reactivePowerKvar!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 3, name: 'power_factor', nullable: true, transformer: numericTransformer })
  powerFactor!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 3, name: 'frequency_hz', nullable: true, transformer: numericTransformer })
  frequencyHz!: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'energy_kwh_total', nullable: true, transformer: numericTransformer })
  energyKwhTotal!: number | null;
}
