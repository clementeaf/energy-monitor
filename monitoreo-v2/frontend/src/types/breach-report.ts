export type BreachReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreachReportStatus = 'open' | 'notified' | 'resolved';

export interface BreachReport {
  id: string;
  description: string;
  dataTypesAffected: string[];
  estimatedSubjects: number | null;
  severity: BreachReportSeverity;
  detectedAt: string;
  notificationDeadline: string;
  agencyNotifiedAt: string | null;
  subjectsNotifiedAt: string | null;
  status: BreachReportStatus;
  resolutionNotes: string | null;
  reportedByEmail: string;
  createdAt: string;
}

export interface CreateBreachReportPayload {
  description: string;
  dataTypesAffected: string[];
  estimatedSubjects?: number;
  severity: BreachReportSeverity;
  detectedAt: string;
}

export interface UpdateBreachReportPayload {
  status?: 'notified' | 'resolved';
  resolutionNotes?: string;
  agencyNotifiedAt?: string;
  subjectsNotifiedAt?: string;
}
