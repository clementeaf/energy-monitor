import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { OAUTH_SCOPES } from '../lib/oauth-scopes';

export class UpdateOAuthClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn([...OAUTH_SCOPES], { each: true })
  scopes?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  buildingIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(300)
  tokenTtlSeconds?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
