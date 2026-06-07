import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Building } from '../../platform/entities/building.entity';
import { Region } from '../../platform/entities/region.entity';
import { BuildingImportJob } from './building-import-job.entity';
import type { SiteKind } from '../../../common/constants/site-metadata';

export type BuildingImportRowStatus =
  | 'pending'
  | 'valid'
  | 'error'
  | 'duplicate'
  | 'skipped'
  | 'created';

@Entity('building_import_staging_rows')
export class BuildingImportStagingRow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id' })
  jobId!: string;

  @ManyToOne(() => BuildingImportJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: BuildingImportJob;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'row_number', type: 'integer' })
  rowNumber!: number;

  @Column({ name: 'raw_cells', type: 'jsonb', default: {} })
  rawCells!: Record<string, string>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'area_sqm', type: 'decimal', precision: 12, scale: 2, nullable: true })
  areaSqm!: string | null;

  @Column({ name: 'region_code', type: 'varchar', length: 50, nullable: true })
  regionCode!: string | null;

  @Column({ name: 'country_code', type: 'char', length: 2, nullable: true })
  countryCode!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone!: string | null;

  @Column({ name: 'external_site_id', type: 'varchar', length: 100, nullable: true })
  externalSiteId!: string | null;

  @Column({ name: 'site_kind', type: 'varchar', length: 30, nullable: true })
  siteKind!: SiteKind | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'valid', 'error', 'duplicate', 'skipped', 'created'],
    enumName: 'user_import_row_status',
    default: 'pending',
  })
  status!: BuildingImportRowStatus;

  @Column({ name: 'error_codes', type: 'text', array: true, default: [] })
  errorCodes!: string[];

  @Column({ name: 'resolved_region_id', type: 'uuid', nullable: true })
  resolvedRegionId!: string | null;

  @ManyToOne(() => Region, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_region_id' })
  resolvedRegion!: Region | null;

  @Column({ name: 'created_building_id', type: 'uuid', nullable: true })
  createdBuildingId!: string | null;

  @ManyToOne(() => Building, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_building_id' })
  createdBuilding!: Building | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
