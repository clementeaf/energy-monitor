import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, Min } from 'class-validator';

export class UpdateBuildingDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaSqm?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
