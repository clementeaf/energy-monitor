import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Integration } from './integration.entity';

export type IntegrationSyncStatus = 'success' | 'partial' | 'failed';

@Entity('integration_sync_logs')
export class IntegrationSyncLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'integration_id' })
  integrationId!: string;

  @ManyToOne(() => Integration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration!: Integration;

  @Column({ length: 20 })
  status!: IntegrationSyncStatus;

  @Column({ name: 'records_synced', type: 'integer', default: 0 })
  recordsSynced!: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
