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
import { Building } from './building.entity';
import { Tariff } from './tariff.entity';
import { User } from '../../users/entities/user.entity';

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'sent'
  | 'paid'
  | 'voided';

@Entity('invoices')
@Unique(['tenantId', 'invoiceNumber'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'building_id' })
  buildingId!: string;

  @ManyToOne(() => Building, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building!: Building;

  @Column({ name: 'tariff_id', type: 'uuid', nullable: true })
  tariffId!: string | null;

  @ManyToOne(() => Tariff, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tariff_id' })
  tariff!: Tariff | null;

  @Column({ name: 'invoice_number', length: 50 })
  invoiceNumber!: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ length: 20, default: 'draft' })
  status!: InvoiceStatus;

  @Column({ name: 'total_net', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalNet!: string;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 4, default: 0.19 })
  taxRate!: string;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  taxAmount!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser!: User | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
