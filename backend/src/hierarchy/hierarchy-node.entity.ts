import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Meter } from '../meters/meter.entity';

@Entity('hierarchy_nodes')
export class HierarchyNode {
  @ApiProperty({ example: 'TG-PAC4220' })
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @ApiProperty({ example: 'B-PAC4220', nullable: true })
  @Column({ name: 'parent_id', type: 'varchar', length: 20, nullable: true })
  parentId!: string | null;

  @ApiProperty({ example: 'pac4220' })
  @Column({ name: 'building_id', type: 'varchar', length: 50 })
  buildingId!: string;

  @ApiProperty({ example: 'Tablero General' })
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @ApiProperty({ example: 2, description: '1=Edificio, 2=Tablero, 3=Subtablero, 4=Circuito' })
  @Column({ type: 'smallint' })
  level!: number;

  @ApiProperty({ example: 'panel', enum: ['building', 'panel', 'subpanel', 'circuit'] })
  @Column({ name: 'node_type', type: 'varchar', length: 20 })
  nodeType!: string;

  @ApiProperty({ example: 'M001', nullable: true })
  @Column({ name: 'meter_id', type: 'varchar', length: 10, nullable: true })
  meterId!: string | null;

  @ApiProperty({ example: 0 })
  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => HierarchyNode)
  @JoinColumn({ name: 'parent_id' })
  parent!: HierarchyNode | null;

  @ManyToOne(() => Meter)
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter | null;
}
