import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userImportEndpoints } from '../../services/endpoints';
import type {
  CommitUserImportPayload,
  CommitUserImportResponse,
  UserImportRowsQueryParams,
  ValidateUserImportResponse,
} from '../../types/user-import';

export const MAX_USER_IMPORT_BYTES = 1_048_576;

const KEYS = {
  jobs: ['user-import', 'jobs'] as const,
  job: (id: string) => ['user-import', 'job', id] as const,
  rows: (id: string, params: UserImportRowsQueryParams) =>
    ['user-import', 'rows', id, params] as const,
};

/**
 * Triggers browser download of the CSV import template.
 */
export async function downloadUserImportTemplate(): Promise<void> {
  const { data } = await userImportEndpoints.downloadTemplate();
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'usuarios-import-v1.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useUserImportJobsQuery(limit = 20) {
  return useQuery({
    queryKey: [...KEYS.jobs, limit],
    queryFn: async () => {
      const { data } = await userImportEndpoints.listJobs({ limit, offset: 0 });
      return data;
    },
  });
}

export function useUserImportPreviewQuery(jobId: string | null, params: UserImportRowsQueryParams = {}) {
  return useQuery({
    queryKey: KEYS.rows(jobId ?? '', params),
    queryFn: async () => {
      const { data } = await userImportEndpoints.getRows(jobId!, params);
      return data;
    },
    enabled: !!jobId,
  });
}

export function useUserImportJobQuery(jobId: string | null) {
  return useQuery({
    queryKey: KEYS.job(jobId ?? ''),
    queryFn: async () => {
      const { data } = await userImportEndpoints.getJob(jobId!);
      return data;
    },
    enabled: !!jobId,
  });
}

export function useValidateUserImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<ValidateUserImportResponse> => {
      const { data } = await userImportEndpoints.validate(file);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useCommitUserImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      payload,
    }: {
      jobId: string;
      payload: CommitUserImportPayload;
    }): Promise<CommitUserImportResponse> => {
      const { data } = await userImportEndpoints.commit(jobId, payload);
      return data;
    },
    onSuccess: (_data, { jobId }) => {
      qc.invalidateQueries({ queryKey: KEYS.jobs });
      qc.invalidateQueries({ queryKey: KEYS.job(jobId) });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useCancelUserImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => userImportEndpoints.cancel(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}
