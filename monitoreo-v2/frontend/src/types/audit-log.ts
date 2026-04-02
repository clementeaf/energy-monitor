export interface AuditLogEntry {
  id: string;
  tenantId: string | null;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogQueryParams {
  userId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResult {
  data: AuditLogEntry[];
  total: number;
}
