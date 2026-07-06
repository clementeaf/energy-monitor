export type InterventionType = 'inspeccion' | 'reemplazo' | 'configuracion' | 'reparacion' | 'instalacion' | 'otra';
export type InterventionResult = 'solucionado' | 'pendiente_piezas' | 'escalacion';

export interface InterventionRecord {
  id: string;
  tenant_id: string;
  meter_id: string;
  building_id: string;
  intervention_type: InterventionType;
  description: string;
  result: InterventionResult;
  requires_cnr: boolean;
  integrity_hash: string | null;
  created_by: string;
  created_at: string;
}

export interface CreateInterventionPayload {
  meterId: string;
  buildingId: string;
  interventionType: InterventionType;
  description: string;
  result: InterventionResult;
  requiresCnr?: boolean;
}
