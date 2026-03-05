import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Local } from './local.entity';

@Entity('monthly_consumption')
export class MonthlyConsumption {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'local_id', type: 'varchar', length: 50 })
  localId!: string;

  @Column({ type: 'varchar', length: 10 })
  month!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  consumption!: number;

  @Column({ type: 'varchar', length: 10, default: 'kWh' })
  unit!: string;

  @ManyToOne(() => Local, (local) => local.consumption)
  @JoinColumn({ name: 'local_id' })
  local!: Local;
}
