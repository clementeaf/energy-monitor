import { Entity, Column, PrimaryColumn, ValueTransformer } from 'typeorm';

const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('raw_readings')
export class RawReading {
  @PrimaryColumn({ type: 'text', name: 'meter_id' })
  meterId!: string;

  @PrimaryColumn({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ type: 'numeric', name: 'power_kw', nullable: true, transformer: numericTransformer })
  powerKw!: number | null;

  @Column({ type: 'numeric', name: 'reactive_power_kvar', nullable: true, transformer: numericTransformer })
  reactivePowerKvar!: number | null;

  @Column({ type: 'numeric', name: 'power_factor', nullable: true, transformer: numericTransformer })
  powerFactor!: number | null;

  @Column({ type: 'numeric', name: 'energy_kwh_total', nullable: true, transformer: numericTransformer })
  energyKwhTotal!: number | null;
}
