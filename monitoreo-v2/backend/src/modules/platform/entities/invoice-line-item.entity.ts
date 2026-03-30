import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';
import { Meter } from './meter.entity';
import { TenantUnit } from './tenant-unit.entity';

@Entity('invoice_line_items')
export class InvoiceLineItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'invoice_id' })
  invoiceId!: string;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: Invoice;

  @Column({ name: 'meter_id' })
  meterId!: string;

  @ManyToOne(() => Meter, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter;

  @Column({ name: 'tenant_unit_id', type: 'uuid', nullable: true })
  tenantUnitId!: string | null;

  @ManyToOne(() => TenantUnit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tenant_unit_id' })
  tenantUnit!: TenantUnit | null;

  @Column({ name: 'kwh_consumption', type: 'decimal', precision: 12, scale: 2, default: 0 })
  kwhConsumption!: string;

  @Column({ name: 'kw_demand_max', type: 'decimal', precision: 10, scale: 2, default: 0 })
  kwDemandMax!: string;

  @Column({ name: 'kvarh_reactive', type: 'decimal', precision: 12, scale: 2, default: 0 })
  kvarhReactive!: string;

  @Column({ name: 'kwh_exported', type: 'decimal', precision: 12, scale: 2, default: 0 })
  kwhExported!: string;

  @Column({ name: 'net_balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  netBalance!: string;

  @Column({ name: 'energy_charge', type: 'decimal', precision: 12, scale: 2, default: 0 })
  energyCharge!: string;

  @Column({ name: 'demand_charge', type: 'decimal', precision: 12, scale: 2, default: 0 })
  demandCharge!: string;

  @Column({ name: 'reactive_charge', type: 'decimal', precision: 12, scale: 2, default: 0 })
  reactiveCharge!: string;

  @Column({ name: 'fixed_charge', type: 'decimal', precision: 12, scale: 2, default: 0 })
  fixedCharge!: string;

  @Column({ name: 'total_net', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalNet!: string;
}
