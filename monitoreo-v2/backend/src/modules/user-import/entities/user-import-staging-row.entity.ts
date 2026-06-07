import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { UserImportJob } from './user-import-job.entity';
import type { UserImportAuthProvider, UserImportRowStatus } from '../user-import.types';

@Entity('user_import_staging_rows')
@Unique(['jobId', 'rowNumber'])
export class UserImportStagingRow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id' })
  jobId!: string;

  @ManyToOne(() => UserImportJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: UserImportJob;

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
  email!: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName!: string | null;

  @Column({ name: 'auth_provider', type: 'varchar', length: 20, nullable: true })
  authProvider!: UserImportAuthProvider | null;

  @Column({ name: 'role_slug', type: 'varchar', length: 50, nullable: true })
  roleSlug!: string | null;

  @Column({ name: 'building_codes_raw', type: 'text', nullable: true })
  buildingCodesRaw!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'valid', 'error', 'duplicate', 'skipped', 'created'],
    enumName: 'user_import_row_status',
    default: 'pending',
  })
  status!: UserImportRowStatus | 'pending' | 'skipped' | 'created';

  @Column({ name: 'error_codes', type: 'text', array: true, default: '{}' })
  errorCodes!: string[];

  @Column({ name: 'resolved_role_id', type: 'uuid', nullable: true })
  resolvedRoleId!: string | null;

  @Column({ name: 'resolved_building_ids', type: 'uuid', array: true, default: '{}' })
  resolvedBuildingIds!: string[];

  @Column({ name: 'created_user_id', type: 'uuid', nullable: true })
  createdUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_user_id' })
  createdUser!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
