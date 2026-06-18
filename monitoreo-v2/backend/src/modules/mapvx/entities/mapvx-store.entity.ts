import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MapvxMall } from './mapvx-mall.entity';

@Entity('mapvx_stores')
@Unique(['mallId', 'externalId'])
export class MapvxStore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'mall_id', type: 'uuid' })
  mallId!: string;

  @ManyToOne(() => MapvxMall, (m) => m.stores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mall_id' })
  mall!: MapvxMall;

  @Column({ name: 'external_id', type: 'varchar', length: 50 })
  externalId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng!: string;

  @Column({ name: 'floor_key', type: 'varchar', length: 50 })
  floorKey!: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  category!: string;
}
