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
import { ProtocolType } from './protocol-type.entity';
import type { ProtocolTypeCode } from '../../../common/constants/protocol-mapping';

@Entity('register_mappings')
export class RegisterMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Null = global template (super_admin only for writes). */
  @Column({ name: 'tenant_id', nullable: true })
  tenantId!: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant | null;

  @Column({ length: 30 })
  protocol!: ProtocolTypeCode | string;

  @ManyToOne(() => ProtocolType)
  @JoinColumn({ name: 'protocol', referencedColumnName: 'code' })
  protocolType!: ProtocolType;

  @Column({ name: 'device_profile', length: 100 })
  deviceProfile!: string;

  @Column({ name: 'register_key', length: 100 })
  registerKey!: string;

  @Column({ name: 'target_field', length: 100 })
  targetField!: string;

  @Column({ name: 'scale_factor', type: 'decimal', precision: 14, scale: 6, default: 1 })
  scaleFactor!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  unit!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
