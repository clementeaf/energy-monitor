export type CnrStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
export type CnrMotivo = 'comm_failure' | 'maintenance' | 'replacement' | 'other';

export interface CnrRecord {
  id: string;
  tenant_id: string;
  meter_id: string;
  building_id: string;
  period_start: string;
  period_end: string;
  value_kwh: number | null;
  motivo: CnrMotivo;
  justification: string | null;
  status: CnrStatus;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CreateCnrPayload {
  meterId: string;
  buildingId: string;
  periodStart: string;
  periodEnd: string;
  valueKwh?: number;
  motivo: CnrMotivo;
  justification: string;
}

export interface UpdateCnrStatusPayload {
  status: 'in_review' | 'approved' | 'rejected';
}
