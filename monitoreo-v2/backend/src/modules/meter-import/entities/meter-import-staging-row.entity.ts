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
import { Meter } from '../../platform/entities/meter.entity';
import { BuildingHierarchy } from '../../platform/entities/building-hierarchy.entity';
import { MeterImportJob } from './meter-import-job.entity';
import type { LoadCategory } from '../../../common/constants/site-metadata';
import type { MeterPhaseType } from '../../platform/entities/meter.entity';

export type MeterImportRowStatus =
  | 'pending'
  | 'valid'
  | 'error'
  | 'duplicate'
  | 'skipped'
  | 'created';

@Entity('meter_import_staging_rows')
export class MeterImportStagingRow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id' })
  jobId!: string;

  @ManyToOne(() => MeterImportJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: MeterImportJob;

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

  @Column({ type: 'varchar', length: 100, nullable: true })
  code!: string | null;

  @Column({ name: 'building_code', type: 'varchar', length: 50, nullable: true })
  buildingCode!: string | null;

  @Column({ name: 'external_site_id', type: 'varchar', length: 100, nullable: true })
  externalSiteId!: string | null;

  @Column({ name: 'meter_type', type: 'varchar', length: 50, nullable: true })
  meterType!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model!: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  serialNumber!: string | null;

  @Column({ name: 'phase_type', type: 'varchar', length: 20, nullable: true })
  phaseType!: MeterPhaseType | null;

  @Column({ name: 'load_category', type: 'varchar', length: 30, nullable: true })
  loadCategory!: LoadCategory | null;

  @Column({ name: 'parent_meter_code', type: 'varchar', length: 100, nullable: true })
  parentMeterCode!: string | null;

  @Column({ name: 'hierarchy_node_name', type: 'varchar', length: 255, nullable: true })
  hierarchyNodeName!: string | null;

  @Column({ name: 'modbus_address', type: 'smallint', nullable: true })
  modbusAddress!: number | null;

  @Column({ name: 'bus_id', type: 'varchar', length: 100, nullable: true })
  busId!: string | null;

  @Column({ name: 'uplink_route', type: 'varchar', length: 50, nullable: true })
  uplinkRoute!: string | null;

  @Column({ name: 'external_id', type: 'varchar', length: 100, nullable: true })
  externalId!: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive!: boolean | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'valid', 'error', 'duplicate', 'skipped', 'created'],
    enumName: 'user_import_row_status',
    default: 'pending',
  })
  status!: MeterImportRowStatus;

  @Column({ name: 'error_codes', type: 'text', array: true, default: [] })
  errorCodes!: string[];

  @Column({ name: 'resolved_building_id', type: 'uuid', nullable: true })
  resolvedBuildingId!: string | null;

  @ManyToOne(() => Building, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_building_id' })
  resolvedBuilding!: Building | null;

  @Column({ name: 'resolved_parent_meter_id', type: 'uuid', nullable: true })
  resolvedParentMeterId!: string | null;

  @ManyToOne(() => Meter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_parent_meter_id' })
  resolvedParentMeter!: Meter | null;

  @Column({ name: 'resolved_hierarchy_node_id', type: 'uuid', nullable: true })
  resolvedHierarchyNodeId!: string | null;

  @ManyToOne(() => BuildingHierarchy, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_hierarchy_node_id' })
  resolvedHierarchyNode!: BuildingHierarchy | null;

  @Column({ name: 'created_meter_id', type: 'uuid', nullable: true })
  createdMeterId!: string | null;

  @ManyToOne(() => Meter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_meter_id' })
  createdMeter!: Meter | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
