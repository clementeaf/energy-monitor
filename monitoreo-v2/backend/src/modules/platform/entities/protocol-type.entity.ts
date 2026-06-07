import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('protocol_types')
export class ProtocolType {
  @PrimaryColumn({ length: 30 })
  code!: string;

  @Column({ length: 100 })
  label!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}
