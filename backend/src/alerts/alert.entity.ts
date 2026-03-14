import { Entity, Column, PrimaryGeneratedColumn, ValueTransformer } from 'typeorm';

const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20, name: 'meter_id' })
  meterId!: string;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ type: 'varchar', length: 50, name: 'alert_type' })
  alertType!: string;

  @Column({ type: 'varchar', length: 10 })
  severity!: string;

  @Column({ type: 'varchar', length: 30 })
  field!: string;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true, transformer: numericTransformer })
  value!: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true, transformer: numericTransformer })
  threshold!: number | null;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'NOW()' })
  createdAt!: Date;
}
