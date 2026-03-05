import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Building } from '../buildings/building.entity';

@Entity('meters')
export class Meter {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id!: string;

  @Column({ name: 'building_id', type: 'varchar', length: 50 })
  buildingId!: string;

  @Column({ type: 'varchar', length: 20 })
  model!: string;

  @Column({ name: 'phase_type', type: 'varchar', length: 5 })
  phaseType!: string;

  @Column({ name: 'bus_id', type: 'varchar', length: 30 })
  busId!: string;

  @Column({ name: 'modbus_address', type: 'smallint' })
  modbusAddress!: number;

  @Column({ name: 'uplink_route', type: 'varchar', length: 100 })
  uplinkRoute!: string;

  @Column({ type: 'varchar', length: 10, default: 'online' })
  status!: string;

  @Column({ name: 'last_reading_at', type: 'timestamptz', nullable: true })
  lastReadingAt!: Date | null;

  @ManyToOne(() => Building, (b) => b.meters)
  @JoinColumn({ name: 'building_id' })
  building!: Building;
}
