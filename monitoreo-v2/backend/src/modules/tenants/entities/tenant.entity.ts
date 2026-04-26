import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 100, unique: true })
  slug!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'primary_color', length: 7, default: '#3D3BF3' })
  primaryColor!: string;

  @Column({ name: 'secondary_color', length: 7, default: '#1E1E2F' })
  secondaryColor!: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'favicon_url', type: 'text', nullable: true })
  faviconUrl!: string | null;

  @Column({ name: 'app_title', length: 100, default: 'Energy Monitor' })
  appTitle!: string;

  @Column({ name: 'sidebar_color', length: 7, default: '#1E1E2F' })
  sidebarColor!: string;

  @Column({ name: 'accent_color', length: 7, default: '#10B981' })
  accentColor!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ name: 'address_detail', type: 'varchar', length: 255, nullable: true })
  addressDetail!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ name: 'tax_id', type: 'varchar', length: 50, nullable: true })
  taxId!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  settings!: Record<string, unknown>;

  @Column({ length: 50, default: 'America/Santiago' })
  timezone!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users!: User[];
}
