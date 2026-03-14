import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('store_type')
export class StoreType {
  @PrimaryColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'text' })
  name!: string;
}
