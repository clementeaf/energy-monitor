import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Building } from '../buildings/building.entity';
import { MonthlyConsumption } from './monthly-consumption.entity';

@Entity('locals')
export class Local {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'building_id', type: 'varchar', length: 50 })
  buildingId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'smallint' })
  floor!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  area!: number;

  @Column({ type: 'varchar', length: 100 })
  type!: string;

  @ManyToOne(() => Building, (building) => building.locals)
  @JoinColumn({ name: 'building_id' })
  building!: Building;

  @OneToMany(() => MonthlyConsumption, (mc) => mc.local)
  consumption!: MonthlyConsumption[];
}
