import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type InterventionType = 'inspeccion' | 'reemplazo' | 'configuracion' | 'reparacion' | 'instalacion' | 'otra';
export type InterventionResult = 'solucionado' | 'pendiente_piezas' | 'escalacion';

@Entity('interventions')
export class Intervention {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'meter_id', type: 'uuid' })
  meterId!: string;

  @Column({ name: 'building_id', type: 'uuid' })
  buildingId!: string;

  @Column({ name: 'intervention_type', length: 30 })
  interventionType!: InterventionType;

  @Column({ type: 'text' })
  description!: string;

  @Column({ length: 30 })
  result!: InterventionResult;

  @Column({ name: 'requires_cnr', default: false })
  requiresCnr!: boolean;

  @Column({ name: 'integrity_hash', length: 64, nullable: true })
  integrityHash!: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
