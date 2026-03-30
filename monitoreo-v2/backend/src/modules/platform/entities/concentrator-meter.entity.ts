import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Concentrator } from './concentrator.entity';
import { Meter } from './meter.entity';

@Entity('concentrator_meters')
export class ConcentratorMeter {
  @PrimaryColumn({ name: 'concentrator_id' })
  concentratorId!: string;

  @PrimaryColumn({ name: 'meter_id' })
  meterId!: string;

  @ManyToOne(() => Concentrator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concentrator_id' })
  concentrator!: Concentrator;

  @ManyToOne(() => Meter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter;

  @Column({ name: 'bus_number', type: 'smallint', default: 1 })
  busNumber!: number;

  @Column({ name: 'modbus_address', type: 'smallint', nullable: true })
  modbusAddress!: number | null;
}
