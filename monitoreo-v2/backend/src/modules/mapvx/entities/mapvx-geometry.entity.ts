import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MapvxMall } from './mapvx-mall.entity';

@Entity('mapvx_geometries')
@Unique(['mallId', 'floorKey', 'layer'])
export class MapvxGeometry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'mall_id', type: 'uuid' })
  mallId!: string;

  @ManyToOne(() => MapvxMall, (m) => m.geometries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mall_id' })
  mall!: MapvxMall;

  @Column({ name: 'floor_key', type: 'varchar', length: 50 })
  floorKey!: string;

  @Column({ type: 'varchar', length: 20 })
  layer!: string;

  @Column({ type: 'jsonb' })
  geojson!: Record<string, unknown>;
}
