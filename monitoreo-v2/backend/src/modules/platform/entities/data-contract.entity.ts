import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export interface DataContractSchema {
  exportType?: string;
  formats?: string[];
  columns?: string[];
}

@Entity('data_contracts')
export class DataContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 50 })
  version!: string;

  @Column({ name: 'schema_json', type: 'jsonb', default: () => "'{}'" })
  schemaJson!: DataContractSchema;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
