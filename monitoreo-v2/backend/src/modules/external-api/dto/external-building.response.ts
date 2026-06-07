import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Building } from '../../platform/entities/building.entity';
import type { SiteKind } from '../../../common/constants/site-metadata';

export class ExternalBuildingResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiPropertyOptional({ example: 'CL', description: 'ISO 3166-1 alpha-2 country code' })
  countryCode!: string | null;

  @ApiPropertyOptional({ example: 'America/Santiago', description: 'IANA timezone; falls back to tenant default when null' })
  timezone!: string | null;

  @ApiPropertyOptional({ description: 'External ERP/site identifier scoped per tenant' })
  externalSiteId!: string | null;

  @ApiPropertyOptional({ enum: ['mall', 'outlet', 'strip', 'office', 'other'] })
  siteKind!: SiteKind | null;

  @ApiPropertyOptional({ format: 'uuid' })
  regionId!: string | null;

  @ApiPropertyOptional()
  regionName!: string | null;
}

/**
 * Maps a Building entity to the external API v1 response shape.
 */
export function toExternalBuilding(building: Building): ExternalBuildingResponse {
  return {
    id: building.id,
    name: building.name,
    code: building.code,
    countryCode: building.countryCode,
    timezone: building.timezone,
    externalSiteId: building.externalSiteId,
    siteKind: building.siteKind,
    regionId: building.regionId,
    regionName: building.region?.name ?? null,
  };
}
