import { Entity, Column, PrimaryColumn, ValueTransformer } from 'typeorm';

const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('building_summary')
export class BuildingSummary {
  @PrimaryColumn({ type: 'text', name: 'building_name' })
  buildingName!: string;

  @PrimaryColumn({ type: 'date' })
  month!: string;

  @Column({ type: 'smallint', name: 'total_stores' })
  totalStores!: number;

  @Column({ type: 'smallint', name: 'store_types' })
  storeTypes!: number;

  @Column({ type: 'smallint', name: 'total_meters' })
  totalMeters!: number;

  @Column({ type: 'smallint', name: 'assigned_meters' })
  assignedMeters!: number;

  @Column({ type: 'smallint', name: 'unassigned_meters' })
  unassignedMeters!: number;

  @Column({ type: 'int', name: 'area_sqm', nullable: true })
  areaSqm!: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'total_kwh', nullable: true, transformer: numericTransformer })
  totalKwh!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'total_power_kw', nullable: true, transformer: numericTransformer })
  totalPowerKw!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'avg_power_kw', nullable: true, transformer: numericTransformer })
  avgPowerKw!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'peak_power_kw', nullable: true, transformer: numericTransformer })
  peakPowerKw!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'total_reactive_kvar', nullable: true, transformer: numericTransformer })
  totalReactiveKvar!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 3, name: 'avg_power_factor', nullable: true, transformer: numericTransformer })
  avgPowerFactor!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'peak_demand_kw', nullable: true, transformer: numericTransformer })
  peakDemandKw!: number | null;
}
