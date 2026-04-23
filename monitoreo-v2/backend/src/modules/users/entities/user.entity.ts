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
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
@Unique(['tenantId', 'email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ length: 255 })
  email!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName!: string | null;

  @Column({ name: 'auth_provider', length: 20 })
  authProvider!: 'microsoft' | 'google';

  @Column({ name: 'auth_provider_id', length: 255 })
  authProviderId!: string;

  @Column({ name: 'role_id' })
  roleId!: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'mfa_secret', type: 'varchar', length: 255, nullable: true, default: null })
  mfaSecret!: string | null;

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled!: boolean;

  @Column({ name: 'mfa_recovery_codes', type: 'text', nullable: true, default: null })
  mfaRecoveryCodes!: string | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true, default: null })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
