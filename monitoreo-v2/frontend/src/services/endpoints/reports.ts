import api from '../api';
import { API_ROUTES } from '../routes';
import type {
  Report,
  ReportQueryParams,
  GenerateReportPayload,
  ScheduledReport,
  ScheduledReportQueryParams,
  CreateScheduledReportPayload,
  UpdateScheduledReportPayload,
} from '../../types/report';

const apiBase = (): string => {
  const b = import.meta.env.VITE_API_BASE_URL || '/api';
  return b.endsWith('/') ? b.slice(0, -1) : b;
};

export const reportsEndpoints = {
  list: (params?: ReportQueryParams) =>
    api.get<Report[]>(API_ROUTES.reports, { params }),

  get: (id: string) =>
    api.get<Report>(`${API_ROUTES.reports}/${id}`),

  generate: ({ buildingId, ...rest }: GenerateReportPayload) =>
    api.post<Report>(`${API_ROUTES.reports}/generate`, { ...rest, ...(buildingId ? { buildingId } : {}) }),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.reports}/${id}`),

  exportHref: (id: string, tenantId?: string): string => {
    let url = `${apiBase()}${API_ROUTES.reports}/${id}/export`;
    if (tenantId) {
      url += `?tenantId=${encodeURIComponent(tenantId)}`;
    }
    return url;
  },

  scheduledList: (params?: ScheduledReportQueryParams) =>
    api.get<ScheduledReport[]>(`${API_ROUTES.reports}/scheduled`, { params }),

  scheduledCreate: (payload: CreateScheduledReportPayload) =>
    api.post<ScheduledReport>(`${API_ROUTES.reports}/scheduled`, payload),

  scheduledUpdate: (id: string, payload: UpdateScheduledReportPayload) =>
    api.patch<ScheduledReport>(`${API_ROUTES.reports}/scheduled/${id}`, payload),

  scheduledRemove: (id: string) =>
    api.delete(`${API_ROUTES.reports}/scheduled/${id}`),
};
