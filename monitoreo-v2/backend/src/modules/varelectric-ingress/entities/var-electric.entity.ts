import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('var_electric')
export class VarElectric {
  @PrimaryColumn({ name: 'idvar_electric' })
  id!: number;

  @Column()
  estado!: number;

  @Column({ name: 'id_remarcador' })
  idRemarcador!: number;

  @Column({ type: 'timestamp' })
  fecha!: Date;

  @Column({ type: 'double precision', nullable: true })
  tag1!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag2!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag3!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag4!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag5!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag6!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag7!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag8!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag9!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag10!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag11!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag12!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag13!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag14!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag15!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag16!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag17!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag18!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag19!: number | null;

  @Column({ type: 'double precision', nullable: true })
  tag20!: number | null;
}
