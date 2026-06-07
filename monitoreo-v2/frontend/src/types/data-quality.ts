export interface DataQualityReportRow {
  buildingId: string;
  day: string;
  measuredPct: number;
  estimatedPct: number;
  invalidPct: number;
  unknownPct: number;
  total: number;
}

export interface DataQualityReportResponse {
  tenantId: string;
  from: string;
  to: string;
  rows: DataQualityReportRow[];
  summary: {
    avgMeasuredPct: number;
    avgInvalidPct: number;
    totalReadings: number;
  };
}

export interface DataQualityReportParams {
  from: string;
  to: string;
  tenantId?: string;
}
