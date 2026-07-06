import { IsUUID, IsDateString, IsNumber, IsString, IsIn, MinLength, IsOptional } from 'class-validator';

export class CreateCnrDto {
  @IsUUID()
  meterId!: string;

  @IsUUID()
  buildingId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsNumber()
  @IsOptional()
  valueKwh?: number;

  @IsIn(['comm_failure', 'maintenance', 'replacement', 'other'])
  motivo!: string;

  @IsString()
  @MinLength(20)
  justification!: string;
}
