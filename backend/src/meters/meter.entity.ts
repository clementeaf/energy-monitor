import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Building } from '../buildings/building.entity';

@Entity('meters')
export class Meter {
  @ApiProperty({ example: 'M001' })
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id!: string;

  @ApiProperty({ example: 'pac4220' })
  @Column({ name: 'building_id', type: 'varchar', length: 50 })
  buildingId!: string;

  @ApiProperty({ example: 'PAC4220' })
  @Column({ type: 'varchar', length: 20 })
  model!: string;

  @ApiProperty({ example: '3P', enum: ['1P', '3P'] })
  @Column({ name: 'phase_type', type: 'varchar', length: 5 })
  phaseType!: string;

  @ApiProperty({ example: 'BUS-A1' })
  @Column({ name: 'bus_id', type: 'varchar', length: 30 })
  busId!: string;

  @ApiProperty({ example: 1 })
  @Column({ name: 'modbus_address', type: 'smallint' })
  modbusAddress!: number;

  @ApiProperty({ example: 'GW01→BUS-A1→M001' })
  @Column({ name: 'uplink_route', type: 'varchar', length: 100 })
  uplinkRoute!: string;

  @ApiProperty({ example: 'Retail', nullable: true, description: 'Rubro del local (docx: store_type). Null en legacy.' })
  @Column({ name: 'store_type', type: 'varchar', length: 100, nullable: true })
  storeType!: string | null;

  @ApiProperty({ example: 'Falabella', nullable: true, description: 'Nombre del local (docx: store_name). Null en legacy.' })
  @Column({ name: 'store_name', type: 'varchar', length: 200, nullable: true })
  storeName!: string | null;

  @ApiProperty({ example: 'online', enum: ['online', 'offline'] })
  @Column({ type: 'varchar', length: 10, default: 'online' })
  status!: string;

  @ApiProperty({ example: '2026-03-06T14:32:00.000Z', nullable: true })
  @Column({ name: 'last_reading_at', type: 'timestamptz', nullable: true })
  lastReadingAt!: Date | null;

  @ManyToOne(() => Building, (b) => b.meters)
  @JoinColumn({ name: 'building_id' })
  building!: Building;
}
