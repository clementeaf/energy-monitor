import { useQuery } from '@tanstack/react-query';
import { auditLogsEndpoints } from '../../services/endpoints';
import type { AuditLogQueryParams, AuditLogResult } from '../../types/audit-log';

const KEYS = {
  all: ['auditLogs'] as const,
  list: (params: AuditLogQueryParams) => ['auditLogs', params] as const,
};

export function useAuditLogsQuery(params?: AuditLogQueryParams) {
  return useQuery({
    queryKey: KEYS.list(params ?? {}),
    queryFn: async (): Promise<AuditLogResult> => {
      const { data } = await auditLogsEndpoints.list(params);
      return data;
    },
  });
}
