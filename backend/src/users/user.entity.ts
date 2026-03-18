import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from '../roles/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
  externalId!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  provider!: string | null;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'role_id', type: 'smallint', default: 4 })
  roleId!: number;

  @Column({ name: 'user_mode', type: 'varchar', length: 20, default: 'holding' })
  userMode!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'invitation_token_hash', type: 'varchar', length: 64, nullable: true })
  invitationTokenHash!: string | null;

  @Column({ name: 'invitation_expires_at', type: 'timestamptz', nullable: true })
  invitationExpiresAt!: Date | null;

  @Column({ name: 'invitation_sent_at', type: 'timestamptz', nullable: true })
  invitationSentAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}
