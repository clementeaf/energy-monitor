export interface Region {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  countryCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRegionPayload {
  code: string;
  name: string;
  countryCode: string;
}

export interface UpdateRegionPayload {
  code?: string;
  name?: string;
  countryCode?: string;
}
