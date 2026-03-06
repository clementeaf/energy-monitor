import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Meter } from '../meters/meter.entity';

@Entity('buildings')
export class Building {
  @ApiProperty({ example: 'pac4220' })
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @ApiProperty({ example: 'Edificio PAC 4220' })
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @ApiProperty({ example: 'Av. Principal 4220' })
  @Column({ type: 'varchar', length: 300 })
  address!: string;

  @ApiProperty({ example: 1200.5 })
  @Column({ name: 'total_area', type: 'numeric', precision: 10, scale: 2 })
  totalArea!: number;

  @OneToMany(() => Meter, (meter) => meter.building)
  meters!: Meter[];
}
