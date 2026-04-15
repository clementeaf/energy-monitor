import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ length: 255 })
  name!: string;

  /** SHA-256 hex of the full API key. */
  @Column({ name: 'key_hash', length: 64, unique: true })
  keyHash!: string;

  /** First 8 chars of the key for display/identification. */
  @Column({ name: 'key_prefix', length: 12 })
  keyPrefix!: string;

  /** Permission strings, e.g. ['buildings:read', 'meters:read']. */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  permissions!: string[];

  /** Building UUIDs this key can access. Empty = all buildings. */
  @Column({ name: 'building_ids', type: 'uuid', array: true, default: () => "'{}'" })
  buildingIds!: string[];

  @Column({ name: 'rate_limit_per_minute', type: 'int', default: 60 })
  rateLimitPerMinute!: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
