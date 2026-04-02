export interface NotificationLog {
  id: string;
  tenantId: string;
  alertId: string;
  channel: 'email' | 'webhook' | 'push' | 'whatsapp' | 'sms';
  status: 'sent' | 'failed' | 'pending';
  recipient: string | null;
  subject: string;
  body: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface NotificationLogQueryParams {
  alertId?: string;
  channel?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationLogResult {
  data: NotificationLog[];
  total: number;
}
