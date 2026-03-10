import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('modules')
export class ViewModule {
  @PrimaryColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 60 })
  label!: string;

  @Column({ name: 'route_path', type: 'varchar', length: 120 })
  routePath!: string;

  @Column({ name: 'navigation_group', type: 'varchar', length: 40 })
  navigationGroup!: string;

  @Column({ name: 'show_in_nav', type: 'boolean', default: false })
  showInNav!: boolean;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
