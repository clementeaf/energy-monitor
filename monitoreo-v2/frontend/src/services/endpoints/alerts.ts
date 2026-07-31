import api from '../api';
import { API_ROUTES } from '../routes';
import type {
  Alert, AlertQueryParams, ResolveAlertPayload,
  AlertRule, CreateAlertRulePayload, UpdateAlertRulePayload,
} from '../../types/alert';
import type { EvaluateResult } from '../../types/alert-engine';
import type { FaultEvent, FaultEventQueryParams } from '../../types/fault-event';

export const alertsEndpoints = {
  list: (params?: AlertQueryParams) =>
    api.get<Alert[]>(API_ROUTES.alerts, { params }),

  get: (id: string) =>
    api.get<Alert>(`${API_ROUTES.alerts}/${id}`),

  acknowledge: (id: string) =>
    api.patch<Alert>(`${API_ROUTES.alerts}/${id}/acknowledge`),

  resolve: (id: string, payload?: ResolveAlertPayload) =>
    api.patch<Alert>(`${API_ROUTES.alerts}/${id}/resolve`, payload),
};

export const alertRulesEndpoints = {
  list: (buildingId?: string) =>
    api.get<AlertRule[]>(API_ROUTES.alertRules, { params: buildingId ? { buildingId } : undefined }),

  get: (id: string) =>
    api.get<AlertRule>(`${API_ROUTES.alertRules}/${id}`),

  create: (payload: CreateAlertRulePayload) =>
    api.post<AlertRule>(API_ROUTES.alertRules, payload),

  update: (id: string, payload: UpdateAlertRulePayload) =>
    api.patch<AlertRule>(`${API_ROUTES.alertRules}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.alertRules}/${id}`),
};

export const alertEngineEndpoints = {
  evaluate: () =>
    api.post<EvaluateResult>(`${API_ROUTES.alertEngine}/evaluate`),
};

export const faultEventsEndpoints = {
  list: (params?: FaultEventQueryParams) =>
    api.get<FaultEvent[]>(API_ROUTES.faultEvents, { params }),

  get: (id: string) =>
    api.get<FaultEvent>(`${API_ROUTES.faultEvents}/${id}`),
};
