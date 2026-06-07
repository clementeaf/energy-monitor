export interface BalanceAnomaly {
  id: string;
  parentMeterId: string;
  parentMeterName: string | null;
  parentMeterCode: string | null;
  day: string;
  sumChildren: string;
  parentKwh: string;
  delta: string;
  deltaPct: string | null;
  detectedAt: string;
}

export interface BalanceAnomalyQueryParams {
  from?: string;
  to?: string;
  limit?: number;
}

export interface DataSloBreach {
  id: string;
  tenantId: string;
  sloType: string;
  breachedAt: string;
  detail: Record<string, unknown>;
}

export interface DataContract {
  id: string;
  tenantId: string | null;
  name: string;
  version: string;
  schemaJson: {
    exportType?: string;
    formats?: string[];
    columns?: string[];
  };
  effectiveFrom: string;
  createdAt: string;
}

export const READINGS_EXPORT_CONTRACT_HEADER = 'x-data-contract-version';
export const READINGS_EXPORT_CONTRACT_DEFAULT = 'readings-export@1.0.0';
