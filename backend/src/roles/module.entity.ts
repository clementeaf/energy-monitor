import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('modules')
export class Module_ {
  @PrimaryColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 60 })
  label!: string;
}
