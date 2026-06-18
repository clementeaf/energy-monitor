import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsISO31661Alpha2,
  IsIn,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SITE_KINDS, type SiteKind } from '../../../common/constants/site-metadata';

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

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsISO31661Alpha2()
  countryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalSiteId?: string;

  @IsOptional()
  @IsIn([...SITE_KINDS])
  siteKind?: SiteKind;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  /** Only used by super_admin in cross-tenant mode. */
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
