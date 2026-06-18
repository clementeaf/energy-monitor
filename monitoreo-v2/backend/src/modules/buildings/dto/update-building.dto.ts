import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsISO31661Alpha2,
  IsIn,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SITE_KINDS, type SiteKind } from '../../../common/constants/site-metadata';

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

  @IsOptional()
  @IsUUID()
  regionId?: string | null;

  @IsOptional()
  @IsISO31661Alpha2()
  countryCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalSiteId?: string | null;

  @IsOptional()
  @IsIn([...SITE_KINDS])
  siteKind?: SiteKind | null;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;
}
