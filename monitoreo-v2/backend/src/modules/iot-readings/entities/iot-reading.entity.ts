import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('iot_readings')
@Index('idx_iot_readings_tenant_meter', ['tenantId', 'meterId', 'time'])
@Index('idx_iot_readings_variable', ['tenantId', 'variableName', 'time'])
export class IotReading {
  @PrimaryColumn({ type: 'timestamptz' })
  time!: Date;

  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @PrimaryColumn({ name: 'meter_id', type: 'uuid' })
  meterId!: string;

  @PrimaryColumn({ name: 'variable_name', type: 'varchar', length: 100 })
  variableName!: string;

  @Column({ type: 'double precision' })
  value!: number;

  @Column({ type: 'integer', default: 0 })
  quality!: number;
}
