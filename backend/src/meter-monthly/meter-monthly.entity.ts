import { Entity, Column, PrimaryColumn, ValueTransformer } from 'typeorm';

const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('meter_monthly')
export class MeterMonthly {
  @PrimaryColumn({ type: 'varchar', length: 10, name: 'meter_id' })
  meterId!: string;

  @PrimaryColumn({ type: 'date' })
  month!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'total_kwh', nullable: true, transformer: numericTransformer })
  totalKwh!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'avg_power_kw', nullable: true, transformer: numericTransformer })
  avgPowerKw!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'peak_power_kw', nullable: true, transformer: numericTransformer })
  peakPowerKw!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'total_reactive_kvar', nullable: true, transformer: numericTransformer })
  totalReactiveKvar!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 3, name: 'avg_power_factor', nullable: true, transformer: numericTransformer })
  avgPowerFactor!: number | null;
}
