import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StoreType } from './store-type.entity';

@Entity('store')
export class Store {
  @PrimaryColumn({ type: 'varchar', length: 10, name: 'meter_id' })
  meterId!: string;

  @Column({ type: 'text', name: 'store_name' })
  storeName!: string;

  @Column({ type: 'smallint', name: 'store_type_id' })
  storeTypeId!: number;

  @Column({ type: 'boolean', name: 'is_three_phase', default: false })
  isThreePhase!: boolean;

  @ManyToOne(() => StoreType, { eager: true })
  @JoinColumn({ name: 'store_type_id' })
  storeType!: StoreType;
}
