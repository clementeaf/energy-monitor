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
import { TenantUnit } from '../../platform/entities/tenant-unit.entity';
import { TenantUnitImportJob } from './tenant-unit-import-job.entity';

export type TenantUnitImportRowStatus =
  | 'pending'
  | 'valid'
  | 'error'
  | 'duplicate'
  | 'skipped'
  | 'created';

@Entity('tenant_unit_import_staging_rows')
export class TenantUnitImportStagingRow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id' })
  jobId!: string;

  @ManyToOne(() => TenantUnitImportJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: TenantUnitImportJob;

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

  @Column({ name: 'unit_code', type: 'varchar', length: 50, nullable: true })
  unitCode!: string | null;

  @Column({ name: 'building_code', type: 'varchar', length: 50, nullable: true })
  buildingCode!: string | null;

  @Column({ name: 'external_site_id', type: 'varchar', length: 100, nullable: true })
  externalSiteId!: string | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 255, nullable: true })
  contactName!: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'external_unit_id', type: 'varchar', length: 100, nullable: true })
  externalUnitId!: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'valid', 'error', 'duplicate', 'skipped', 'created'],
    enumName: 'user_import_row_status',
    default: 'pending',
  })
  status!: TenantUnitImportRowStatus;

  @Column({ name: 'error_codes', type: 'text', array: true, default: [] })
  errorCodes!: string[];

  @Column({ name: 'resolved_building_id', type: 'uuid', nullable: true })
  resolvedBuildingId!: string | null;

  @ManyToOne(() => Building, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_building_id' })
  resolvedBuilding!: Building | null;

  @Column({ name: 'created_tenant_unit_id', type: 'uuid', nullable: true })
  createdTenantUnitId!: string | null;

  @ManyToOne(() => TenantUnit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_tenant_unit_id' })
  createdTenantUnit!: TenantUnit | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
