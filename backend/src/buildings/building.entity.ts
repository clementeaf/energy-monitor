import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Local } from '../locals/local.entity';

@Entity('buildings')
export class Building {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 300 })
  address!: string;

  @Column({ name: 'total_area', type: 'numeric', precision: 10, scale: 2 })
  totalArea!: number;

  @OneToMany(() => Local, (local) => local.building)
  locals!: Local[];
}
