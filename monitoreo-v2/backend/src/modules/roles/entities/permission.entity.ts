import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('permissions')
@Unique(['module', 'action'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  module!: string;

  @Column({ length: 50 })
  action!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
