import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsEndpoints } from '../../services/endpoints';
import type {
  ReportQueryParams,
  GenerateReportPayload,
  ScheduledReportQueryParams,
  CreateScheduledReportPayload,
  UpdateScheduledReportPayload,
} from '../../types/report';

const REPORTS_KEY = ['reports'] as const;
const SCHEDULED_KEY = ['reports', 'scheduled'] as const;

/**
 * Lists generated reports with optional filters.
 * @param params - Optional building and type filters
 * @param options - Query options (e.g. enabled when RBAC allows read)
 */
export function useReportsQuery(
  params?: ReportQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...REPORTS_KEY, params ?? {}],
    queryFn: () => reportsEndpoints.list(params).then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Lists scheduled report definitions.
 * @param params - Optional filters
 * @param options - Query options
 */
export function useScheduledReportsQuery(
  params?: ScheduledReportQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...SCHEDULED_KEY, params ?? {}],
    queryFn: () => reportsEndpoints.scheduledList(params).then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Creates a report row and allows export via GET export.
 */
export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateReportPayload) =>
      reportsEndpoints.generate(payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORTS_KEY });
    },
  });
}

/**
 * Deletes a generated report record.
 */
export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsEndpoints.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORTS_KEY });
    },
  });
}

/**
 * Creates a recurring scheduled report.
 */
export function useCreateScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateScheduledReportPayload) =>
      reportsEndpoints.scheduledCreate(payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCHEDULED_KEY });
    },
  });
}

/**
 * Updates a scheduled report definition.
 */
export function useUpdateScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateScheduledReportPayload }) =>
      reportsEndpoints.scheduledUpdate(id, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCHEDULED_KEY });
    },
  });
}

/**
 * Deletes a scheduled report definition.
 */
export function useDeleteScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsEndpoints.scheduledRemove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCHEDULED_KEY });
    },
  });
}
