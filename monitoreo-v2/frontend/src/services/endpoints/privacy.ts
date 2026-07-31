import api from '../api';
import { API_ROUTES } from '../routes';
import type {
  BreachReport,
  CreateBreachReportPayload,
  UpdateBreachReportPayload,
} from '../../types/breach-report';

export interface DeletionRequestItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  requestedAt: string;
  resolvedAt: string | null;
  resolvedByEmail: string | null;
  notes: string | null;
}

export const deletionRequestsEndpoints = {
  list: () =>
    api.get<DeletionRequestItem[]>(API_ROUTES.deletionRequests),

  resolve: (id: string, status: 'approved' | 'rejected', notes?: string) =>
    api.patch<{ success: boolean }>(`${API_ROUTES.deletionRequests}/${id}/resolve`, { status, notes }),

  execute: (id: string) =>
    api.patch<{ success: boolean; anonymizedEmail: string }>(`${API_ROUTES.deletionRequests}/${id}/execute`),
};

export interface RectificationRequestItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  fieldName: string;
  currentValue: string | null;
  requestedValue: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  requestedAt: string;
  responseDeadline: string;
  resolvedAt: string | null;
  resolvedByEmail: string | null;
  notes: string | null;
}

export const rectificationRequestsEndpoints = {
  list: () =>
    api.get<RectificationRequestItem[]>(API_ROUTES.rectificationRequests),

  resolve: (id: string, status: 'approved' | 'rejected', notes?: string) =>
    api.patch<{ success: boolean }>(`${API_ROUTES.rectificationRequests}/${id}/resolve`, { status, notes }),

  execute: (id: string) =>
    api.patch<{ success: boolean }>(`${API_ROUTES.rectificationRequests}/${id}/execute`),
};

export const breachReportsEndpoints = {
  list: () => api.get<BreachReport[]>(API_ROUTES.breachReports),
  create: (payload: CreateBreachReportPayload) =>
    api.post<BreachReport>(API_ROUTES.breachReports, payload),
  update: (id: string, payload: UpdateBreachReportPayload) =>
    api.patch<BreachReport>(`${API_ROUTES.breachReports}/${id}`, payload),
};
