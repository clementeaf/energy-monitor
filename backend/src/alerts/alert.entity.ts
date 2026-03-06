import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

@Entity('alerts')
export class Alert {
  @ApiProperty({ example: '0c5b2ea3-52bb-4a75-a19a-b7e36619e9bb' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'METER_OFFLINE' })
  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @ApiProperty({ example: 'high' })
  @Column({ type: 'varchar', length: 20, default: 'high' })
  severity!: string;

  @ApiProperty({ example: 'active', enum: ['active', 'acknowledged', 'resolved'] })
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: AlertStatus;

  @ApiProperty({ example: 'M001', nullable: true })
  @Column({ name: 'meter_id', type: 'varchar', length: 10, nullable: true })
  meterId!: string | null;

  @ApiProperty({ example: 'pac4220', nullable: true })
  @Column({ name: 'building_id', type: 'varchar', length: 50, nullable: true })
  buildingId!: string | null;

  @ApiProperty({ example: 'Medidor M001 offline' })
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @ApiProperty({ example: 'El medidor M001 dejó de reportar lecturas.' })
  @Column({ type: 'text' })
  message!: string;

  @ApiProperty({ example: '2026-03-06T14:35:00.000Z' })
  @Column({ name: 'triggered_at', type: 'timestamptz', default: () => 'now()' })
  triggeredAt!: Date;

  @ApiProperty({ example: '2026-03-06T14:40:00.000Z', nullable: true })
  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @ApiProperty({ example: '2026-03-06T14:55:00.000Z', nullable: true })
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @ApiProperty({
    example: {
      lastReadingAt: '2026-03-06T14:30:00.000Z',
      offlineThresholdMinutes: 5,
      source: 'offline-monitor',
    },
  })
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
