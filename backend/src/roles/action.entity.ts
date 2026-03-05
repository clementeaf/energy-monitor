import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('actions')
export class Action {
  @PrimaryColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  code!: string;
}
