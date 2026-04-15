import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  /** Permission strings, e.g. ['buildings:read', 'meters:read']. */
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  /** Building UUIDs this key can access. Empty/omitted = all buildings. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  buildingIds?: string[];

  /** Requests per minute. Default: 60. */
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;

  /** ISO 8601 date. Null/omitted = never expires. */
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
