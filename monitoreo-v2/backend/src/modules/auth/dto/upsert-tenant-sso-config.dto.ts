import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpsertTenantSsoConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  issuer!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  clientId!: string;

  @IsOptional()
  @IsUrl()
  metadataUrl?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  clientSecret!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  scimWebhookSecret?: string | null;
}
