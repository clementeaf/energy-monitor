import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Meter } from './meter.entity';
import { BuildingHierarchy } from './building-hierarchy.entity';

@Entity('meter_hierarchy')
export class MeterHierarchy {
  @PrimaryColumn({ name: 'meter_id' })
  meterId!: string;

  @PrimaryColumn({ name: 'hierarchy_node_id' })
  hierarchyNodeId!: string;

  @ManyToOne(() => Meter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter;

  @ManyToOne(() => BuildingHierarchy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hierarchy_node_id' })
  hierarchyNode!: BuildingHierarchy;
}
