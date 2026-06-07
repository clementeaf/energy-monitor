import {
  Entity,
  PrimaryColumn,
  Column,
} from 'typeorm';

@Entity('data_quality_daily')
export class DataQualityDaily {
  @PrimaryColumn({ name: 'tenant_id' })
  tenantId!: string;

  @PrimaryColumn({ name: 'building_id' })
  buildingId!: string;

  @PrimaryColumn({ type: 'date' })
  day!: string;

  @Column({ name: 'measured_pct', type: 'decimal', precision: 6, scale: 2, default: 0 })
  measuredPct!: string;

  @Column({ name: 'estimated_pct', type: 'decimal', precision: 6, scale: 2, default: 0 })
  estimatedPct!: string;

  @Column({ name: 'invalid_pct', type: 'decimal', precision: 6, scale: 2, default: 0 })
  invalidPct!: string;

  @Column({ name: 'unknown_pct', type: 'decimal', precision: 6, scale: 2, default: 0 })
  unknownPct!: string;

  @Column({ type: 'bigint', default: 0 })
  total!: string;
}
