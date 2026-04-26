import { IsString, IsOptional, IsNumber, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaSqm?: number;

  /** Only used by super_admin in cross-tenant mode. */
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
