import type { SiteKind } from './site-metadata';

export interface Building {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string | null;
  areaSqm: string | null;
  regionId: string | null;
  countryCode: string | null;
  timezone: string | null;
  externalSiteId: string | null;
  siteKind: SiteKind | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuildingPayload {
  name: string;
  code: string;
  address?: string;
  areaSqm?: number;
  regionId?: string;
  countryCode?: string;
  timezone?: string;
  externalSiteId?: string;
  siteKind?: SiteKind;
  tenantId?: string;
}

export interface UpdateBuildingPayload {
  name?: string;
  address?: string;
  areaSqm?: number;
  isActive?: boolean;
  regionId?: string | null;
  countryCode?: string | null;
  timezone?: string | null;
  externalSiteId?: string | null;
  siteKind?: SiteKind | null;
}
