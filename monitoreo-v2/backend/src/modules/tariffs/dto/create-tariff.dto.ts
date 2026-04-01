import { IsString, IsOptional, IsBoolean, IsUUID, IsDateString, MaxLength } from 'class-validator';

export class CreateTariffDto {
  @IsUUID()
  buildingId!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
