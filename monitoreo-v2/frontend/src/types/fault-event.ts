export type FaultSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface FaultEvent {
  id: string;
  buildingId: string;
  meterId: string | null;
  concentratorId: string | null;
  faultType: string;
  severity: FaultSeverity;
  description: string | null;
  startedAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export interface FaultEventQueryParams {
  buildingId?: string;
  meterId?: string;
  severity?: string;
  faultType?: string;
  dateFrom?: string;
  dateTo?: string;
}
