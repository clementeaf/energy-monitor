export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  alertRuleId: string | null;
  buildingId: string;
  meterId: string | null;
  alertTypeCode: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  triggeredValue: number | null;
  thresholdValue: number | null;
  assignedTo: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export interface AlertQueryParams {
  status?: AlertStatus;
  severity?: AlertSeverity;
  buildingId?: string;
  meterId?: string;
}

export interface ResolveAlertPayload {
  resolutionNotes?: string;
}

export interface AlertRule {
  id: string;
  buildingId: string | null;
  alertTypeCode: string;
  name: string;
  description: string | null;
  severity: AlertSeverity;
  isActive: boolean;
  checkIntervalSeconds: number;
  config: Record<string, unknown>;
  escalationL1Minutes: number;
  escalationL2Minutes: number;
  escalationL3Minutes: number;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyWhatsapp: boolean;
  notifySms: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRulePayload {
  alertTypeCode: string;
  name: string;
  description?: string;
  severity: AlertSeverity;
  buildingId?: string;
  isActive?: boolean;
  checkIntervalSeconds?: number;
  config?: Record<string, unknown>;
  escalationL1Minutes?: number;
  escalationL2Minutes?: number;
  escalationL3Minutes?: number;
  notifyEmail?: boolean;
  notifyPush?: boolean;
  notifyWhatsapp?: boolean;
  notifySms?: boolean;
}

export interface UpdateAlertRulePayload {
  name?: string;
  description?: string;
  severity?: AlertSeverity;
  isActive?: boolean;
  checkIntervalSeconds?: number;
  config?: Record<string, unknown>;
  escalationL1Minutes?: number;
  escalationL2Minutes?: number;
  escalationL3Minutes?: number;
  notifyEmail?: boolean;
  notifyPush?: boolean;
  notifyWhatsapp?: boolean;
  notifySms?: boolean;
}
