export type IngestGapStatus = 'open' | 'resolved';

export interface IngestGap {
  id: string;
  tenantId: string;
  meterId: string;
  gapStart: string;
  gapEnd: string;
  detectedAt: string;
  resolvedAt: string | null;
  status: IngestGapStatus;
}

export interface IngestGapListParams {
  status?: IngestGapStatus;
  limit?: number;
  offset?: number;
}

export interface IngestGapListResponse {
  data: IngestGap[];
  total: number;
}
