import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/user.entity';

@Entity('sessions')
export class Session {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ApiProperty()
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @ApiProperty()
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
