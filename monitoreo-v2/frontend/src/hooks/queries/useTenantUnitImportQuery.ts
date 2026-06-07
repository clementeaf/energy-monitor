import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantUnitImportEndpoints } from '../../services/endpoints';
import type {
  CommitTenantUnitImportResponse,
  TenantUnitImportRowsQueryParams,
  ValidateTenantUnitImportResponse,
} from '../../types/tenant-unit-import';

export const MAX_TENANT_UNIT_IMPORT_BYTES = 1_048_576;

const KEYS = {
  jobs: ['tenant-unit-import', 'jobs'] as const,
  job: (id: string) => ['tenant-unit-import', 'job', id] as const,
  rows: (id: string, params: TenantUnitImportRowsQueryParams) =>
    ['tenant-unit-import', 'rows', id, params] as const,
};

/**
 * Triggers browser download of the CSV import template.
 */
export async function downloadTenantUnitImportTemplate(): Promise<void> {
  const { data } = await tenantUnitImportEndpoints.downloadTemplate();
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'locatarios-import-v1.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useTenantUnitImportJobsQuery(limit = 20) {
  return useQuery({
    queryKey: [...KEYS.jobs, limit],
    queryFn: async () => {
      const { data } = await tenantUnitImportEndpoints.listJobs({ limit, offset: 0 });
      return data;
    },
  });
}

export function useTenantUnitImportPreviewQuery(
  jobId: string | null,
  params: TenantUnitImportRowsQueryParams = {},
) {
  return useQuery({
    queryKey: KEYS.rows(jobId ?? '', params),
    queryFn: async () => {
      const { data } = await tenantUnitImportEndpoints.getRows(jobId!, params);
      return data;
    },
    enabled: !!jobId,
  });
}

export function useValidateTenantUnitImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<ValidateTenantUnitImportResponse> => {
      const { data } = await tenantUnitImportEndpoints.validate(file);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useCommitTenantUnitImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string): Promise<CommitTenantUnitImportResponse> => {
      const { data } = await tenantUnitImportEndpoints.commit(jobId);
      return data;
    },
    onSuccess: (_data, jobId) => {
      qc.invalidateQueries({ queryKey: KEYS.jobs });
      qc.invalidateQueries({ queryKey: KEYS.job(jobId) });
      qc.invalidateQueries({ queryKey: ['tenant-units'] });
    },
  });
}
