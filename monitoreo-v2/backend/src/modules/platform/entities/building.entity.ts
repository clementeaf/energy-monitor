import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Region } from './region.entity';
import type { SiteKind } from '../../../common/constants/site-metadata';

@Entity('buildings')
@Unique(['tenantId', 'code'])
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'area_sqm', type: 'decimal', precision: 12, scale: 2, nullable: true })
  areaSqm!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'region_id', type: 'uuid', nullable: true })
  regionId!: string | null;

  @ManyToOne(() => Region, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'region_id' })
  region!: Region | null;

  @Column({ name: 'country_code', type: 'char', length: 2, nullable: true })
  countryCode!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone!: string | null;

  @Column({ name: 'external_site_id', type: 'varchar', length: 100, nullable: true })
  externalSiteId!: string | null;

  @Column({ name: 'site_kind', type: 'varchar', length: 30, nullable: true })
  siteKind!: SiteKind | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
