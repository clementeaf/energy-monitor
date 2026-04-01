import { IsString, IsOptional, IsUUID, IsEmail, MaxLength } from 'class-validator';

export class CreateTenantUnitDto {
  @IsUUID()
  buildingId!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(50)
  unitCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
