import api from '../api';
import { API_ROUTES } from '../routes';
import type { AuditLogQueryParams, AuditLogResult } from '../../types/audit-log';
import type { NotificationLogQueryParams, NotificationLogResult } from '../../types/notification-log';

export const auditLogsEndpoints = {
  list: (params?: AuditLogQueryParams) =>
    api.get<AuditLogResult>(API_ROUTES.auditLogs, { params }),
};

export const notificationLogsEndpoints = {
  list: (params?: NotificationLogQueryParams) =>
    api.get<NotificationLogResult>(API_ROUTES.notificationLogs, { params }),
};
