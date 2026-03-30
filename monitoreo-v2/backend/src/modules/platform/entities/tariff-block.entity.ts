import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Tariff } from './tariff.entity';

@Entity('tariff_blocks')
export class TariffBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tariff_id' })
  tariffId!: string;

  @ManyToOne(() => Tariff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tariff_id' })
  tariff!: Tariff;

  @Column({ name: 'block_name', length: 50 })
  blockName!: string;

  @Column({ name: 'hour_start', type: 'smallint' })
  hourStart!: number;

  @Column({ name: 'hour_end', type: 'smallint' })
  hourEnd!: number;

  @Column({ name: 'energy_rate', type: 'decimal', precision: 12, scale: 4 })
  energyRate!: string;

  @Column({ name: 'demand_rate', type: 'decimal', precision: 12, scale: 4, default: 0 })
  demandRate!: string;

  @Column({ name: 'reactive_rate', type: 'decimal', precision: 12, scale: 4, default: 0 })
  reactiveRate!: string;

  @Column({ name: 'fixed_charge', type: 'decimal', precision: 12, scale: 2, default: 0 })
  fixedCharge!: string;
}
