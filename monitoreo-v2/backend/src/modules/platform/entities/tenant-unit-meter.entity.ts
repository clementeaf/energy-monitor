import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TenantUnit } from './tenant-unit.entity';
import { Meter } from './meter.entity';

@Entity('tenant_unit_meters')
export class TenantUnitMeter {
  @PrimaryColumn({ name: 'tenant_unit_id' })
  tenantUnitId!: string;

  @PrimaryColumn({ name: 'meter_id' })
  meterId!: string;

  @ManyToOne(() => TenantUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_unit_id' })
  tenantUnit!: TenantUnit;

  @ManyToOne(() => Meter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meter_id' })
  meter!: Meter;
}
