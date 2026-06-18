import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MapvxMall } from './mapvx-mall.entity';

@Entity('mapvx_floors')
@Unique(['mallId', 'externalKey'])
export class MapvxFloor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'mall_id', type: 'uuid' })
  mallId!: string;

  @ManyToOne(() => MapvxMall, (m) => m.floors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mall_id' })
  mall!: MapvxMall;

  @Column({ name: 'external_key', type: 'varchar', length: 50 })
  externalKey!: string;

  @Column({ type: 'varchar', length: 50 })
  label!: string;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  level!: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;
}
