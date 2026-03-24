import { Entity, Column, PrimaryGeneratedColumn, ValueTransformer } from 'typeorm';

const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('iot_readings')
export class IotReading {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 50, name: 'device_id' })
  deviceId!: string;

  @Column({ type: 'varchar', length: 200, name: 'device_name' })
  deviceName!: string;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ type: 'numeric', precision: 7, scale: 2, name: 'voltage_l1', nullable: true, transformer: numericTransformer })
  voltageL1!: number | null;

  @Column({ type: 'numeric', precision: 7, scale: 2, name: 'voltage_l2', nullable: true, transformer: numericTransformer })
  voltageL2!: number | null;

  @Column({ type: 'numeric', precision: 7, scale: 2, name: 'voltage_l3', nullable: true, transformer: numericTransformer })
  voltageL3!: number | null;

  @Column({ type: 'numeric', precision: 7, scale: 2, name: 'voltage_avg', nullable: true, transformer: numericTransformer })
  voltageAvg!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 3, name: 'current_l1', nullable: true, transformer: numericTransformer })
  currentL1!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 3, name: 'current_l2', nullable: true, transformer: numericTransformer })
  currentL2!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 3, name: 'current_l3', nullable: true, transformer: numericTransformer })
  currentL3!: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 3, name: 'current_avg', nullable: true, transformer: numericTransformer })
  currentAvg!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'active_power_w', nullable: true, transformer: numericTransformer })
  activePowerW!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'reactive_power_var', nullable: true, transformer: numericTransformer })
  reactivePowerVar!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'apparent_power_va', nullable: true, transformer: numericTransformer })
  apparentPowerVa!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 3, name: 'power_factor', nullable: true, transformer: numericTransformer })
  powerFactor!: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 3, name: 'frequency_hz', nullable: true, transformer: numericTransformer })
  frequencyHz!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 3, name: 'energy_import_wh', nullable: true, transformer: numericTransformer })
  energyImportWh!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 3, name: 'energy_export_wh', nullable: true, transformer: numericTransformer })
  energyExportWh!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'thd_voltage_l1_pct', nullable: true, transformer: numericTransformer })
  thdVoltageL1Pct!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'thd_voltage_l2_pct', nullable: true, transformer: numericTransformer })
  thdVoltageL2Pct!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'thd_voltage_l3_pct', nullable: true, transformer: numericTransformer })
  thdVoltageL3Pct!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'thd_current_l1_pct', nullable: true, transformer: numericTransformer })
  thdCurrentL1Pct!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'thd_current_l2_pct', nullable: true, transformer: numericTransformer })
  thdCurrentL2Pct!: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'thd_current_l3_pct', nullable: true, transformer: numericTransformer })
  thdCurrentL3Pct!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'peak_demand_w', nullable: true, transformer: numericTransformer })
  peakDemandW!: number | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
