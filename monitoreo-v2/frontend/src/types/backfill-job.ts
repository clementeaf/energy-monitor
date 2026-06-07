export type BackfillJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface BackfillJob {
  id: string;
  tenantId: string;
  meterId: string;
  fromTs: string;
  toTs: string;
  status: BackfillJobStatus;
  rowsProcessed: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBackfillJobPayload {
  meterId: string;
  fromTs: string;
  toTs: string;
}
