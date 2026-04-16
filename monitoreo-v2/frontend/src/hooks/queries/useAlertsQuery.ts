import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsEndpoints, alertRulesEndpoints } from '../../services/endpoints';
import type { Alert, AlertQueryParams, ResolveAlertPayload } from '../../types/alert';
import type { AlertRule, CreateAlertRulePayload, UpdateAlertRulePayload } from '../../types/alert';

const KEYS = {
  alerts: (params?: AlertQueryParams) => params ? ['alerts', params] as const : ['alerts'] as const,
  alertDetail: (id: string) => ['alerts', id] as const,
  rules: (buildingId?: string) => buildingId ? ['alert-rules', { buildingId }] as const : ['alert-rules'] as const,
};

// --- Alerts ---

export function useAlertsQuery(params?: AlertQueryParams) {
  return useQuery({
    queryKey: KEYS.alerts(params),
    queryFn: async (): Promise<Alert[]> => {
      const { data } = await alertsEndpoints.list(params);
      return data;
    },
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsEndpoints.acknowledge(id).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); },
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ResolveAlertPayload }) =>
      alertsEndpoints.resolve(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); },
  });
}

// --- Alert Rules ---

export function useAlertRulesQuery(buildingId?: string) {
  return useQuery({
    queryKey: KEYS.rules(buildingId),
    queryFn: async (): Promise<AlertRule[]> => {
      const { data } = await alertRulesEndpoints.list(buildingId);
      return data;
    },
  });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAlertRulePayload) =>
      alertRulesEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alert-rules'] }); },
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAlertRulePayload }) =>
      alertRulesEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alert-rules'] }); },
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertRulesEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alert-rules'] }); },
  });
}
