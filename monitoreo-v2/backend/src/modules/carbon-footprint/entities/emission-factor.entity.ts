import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from 'typeorm';

@Entity('emission_factors')
@Unique(['countryCode', 'year'])
export class EmissionFactor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'country_code', type: 'char', length: 2 })
  countryCode!: string;

  @Column({ type: 'smallint' })
  year!: number;

  @Column({ name: 'factor_tco2e_per_mwh', type: 'decimal', precision: 8, scale: 4 })
  factorTco2ePerMwh!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source!: string | null;
}
