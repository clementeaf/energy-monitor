import { IsUUID, IsString, IsIn, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class CreateInterventionDto {
  @IsUUID()
  meterId!: string;

  @IsUUID()
  buildingId!: string;

  @IsIn(['inspeccion', 'reemplazo', 'configuracion', 'reparacion', 'instalacion', 'otra'])
  interventionType!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsIn(['solucionado', 'pendiente_piezas', 'escalacion'])
  result!: string;

  @IsBoolean()
  @IsOptional()
  requiresCnr?: boolean;
}
