import { Entity, Column, PrimaryColumn, ValueTransformer } from 'typeorm';

const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('meter_monthly_billing')
export class MeterMonthlyBilling {
  @PrimaryColumn({ type: 'varchar', length: 10, name: 'meter_id' })
  meterId!: string;

  @PrimaryColumn({ type: 'date' })
  month!: string;

  @Column({ type: 'varchar', length: 100, name: 'building_name' })
  buildingName!: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, name: 'total_kwh', nullable: true, transformer: numericTransformer })
  totalKwh!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 2, name: 'energia_clp', nullable: true, transformer: numericTransformer })
  energiaClp!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 2, name: 'dda_max_kw', nullable: true, transformer: numericTransformer })
  ddaMaxKw!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 2, name: 'dda_max_punta_kw', nullable: true, transformer: numericTransformer })
  ddaMaxPuntaKw!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 2, name: 'kwh_troncal', nullable: true, transformer: numericTransformer })
  kwhTroncal!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 2, name: 'kwh_serv_publico', nullable: true, transformer: numericTransformer })
  kwhServPublico!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'cargo_fijo_clp', nullable: true, transformer: numericTransformer })
  cargoFijoClp!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 2, name: 'total_neto_clp', nullable: true, transformer: numericTransformer })
  totalNetoClp!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 2, name: 'iva_clp', nullable: true, transformer: numericTransformer })
  ivaClp!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 2, name: 'monto_exento_clp', nullable: true, transformer: numericTransformer })
  montoExentoClp!: number | null;

  @Column({ type: 'numeric', precision: 16, scale: 2, name: 'total_con_iva_clp', nullable: true, transformer: numericTransformer })
  totalConIvaClp!: number | null;
}
