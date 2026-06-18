import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { MapvxFloor } from './mapvx-floor.entity';
import { MapvxStore } from './mapvx-store.entity';
import { MapvxGeometry } from './mapvx-geometry.entity';

@Entity('mapvx_malls')
export class MapvxMall {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'external_id', type: 'varchar', length: 50, unique: true })
  externalId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'center_lat', type: 'decimal', precision: 10, scale: 7 })
  centerLat!: string;

  @Column({ name: 'center_lng', type: 'decimal', precision: 10, scale: 7 })
  centerLng!: string;

  @Column({ name: 'polygon_coords', type: 'jsonb', nullable: true })
  polygonCoords!: number[][] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => MapvxFloor, (f) => f.mall)
  floors!: MapvxFloor[];

  @OneToMany(() => MapvxStore, (s) => s.mall)
  stores!: MapvxStore[];

  @OneToMany(() => MapvxGeometry, (g) => g.mall)
  geometries!: MapvxGeometry[];
}
