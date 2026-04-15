import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9_]+$/, { message: 'slug must be lowercase alphanumeric with underscores' })
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  maxSessionMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
