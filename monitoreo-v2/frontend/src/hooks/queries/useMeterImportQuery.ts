import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meterImportEndpoints } from '../../services/endpoints';
import type {
  MeterImportRowsQueryParams,
  CommitMeterImportResponse,
  ValidateMeterImportResponse,
} from '../../types/meter-import';

export const MAX_METER_IMPORT_BYTES = 1_048_576;

const KEYS = {
  jobs: ['meter-import', 'jobs'] as const,
  job: (id: string) => ['meter-import', 'job', id] as const,
  rows: (id: string, params: MeterImportRowsQueryParams) =>
    ['meter-import', 'rows', id, params] as const,
};

/**
 * Triggers browser download of the CSV import template.
 */
export async function downloadMeterImportTemplate(): Promise<void> {
  const { data } = await meterImportEndpoints.downloadTemplate();
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'medidores-import-v1.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useMeterImportJobsQuery(limit = 20) {
  return useQuery({
    queryKey: [...KEYS.jobs, limit],
    queryFn: async () => {
      const { data } = await meterImportEndpoints.listJobs({ limit, offset: 0 });
      return data;
    },
  });
}

export function useMeterImportPreviewQuery(
  jobId: string | null,
  params: MeterImportRowsQueryParams = {},
) {
  return useQuery({
    queryKey: KEYS.rows(jobId ?? '', params),
    queryFn: async () => {
      const { data } = await meterImportEndpoints.getRows(jobId!, params);
      return data;
    },
    enabled: !!jobId,
  });
}

export function useValidateMeterImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<ValidateMeterImportResponse> => {
      const { data } = await meterImportEndpoints.validate(file);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useCommitMeterImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string): Promise<CommitMeterImportResponse> => {
      const { data } = await meterImportEndpoints.commit(jobId);
      return data;
    },
    onSuccess: (_data, jobId) => {
      qc.invalidateQueries({ queryKey: KEYS.jobs });
      qc.invalidateQueries({ queryKey: KEYS.job(jobId) });
      qc.invalidateQueries({ queryKey: ['meters'] });
    },
  });
}
