import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  name!: string;

  @Column({ name: 'label_es', type: 'varchar', length: 50 })
  labelEs!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
