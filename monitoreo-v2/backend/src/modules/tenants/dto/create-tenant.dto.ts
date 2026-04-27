import {
  IsBoolean,
  IsHexColor,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  /** URL-safe identifier (lowercase, hyphens). Auto-generated from name if omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  sidebarColor?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appTitle?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressDetail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  /** Email of the first admin user (required for onboarding). */
  @IsString()
  @MaxLength(255)
  adminEmail!: string;

  /** Display name for the first admin user. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  adminDisplayName?: string;

  /** Auth provider for the first admin ('microsoft' | 'google'). */
  @IsIn(['microsoft', 'google'])
  adminAuthProvider!: 'microsoft' | 'google';
}
