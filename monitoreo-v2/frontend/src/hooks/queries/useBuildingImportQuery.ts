import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildingImportEndpoints } from '../../services/endpoints';
import type {
  BuildingImportRowsQueryParams,
  CommitBuildingImportResponse,
  ValidateBuildingImportResponse,
} from '../../types/building-import';

export const MAX_BUILDING_IMPORT_BYTES = 1_048_576;

const KEYS = {
  jobs: ['building-import', 'jobs'] as const,
  job: (id: string) => ['building-import', 'job', id] as const,
  rows: (id: string, params: BuildingImportRowsQueryParams) =>
    ['building-import', 'rows', id, params] as const,
};

/**
 * Triggers browser download of the CSV import template.
 */
export async function downloadBuildingImportTemplate(): Promise<void> {
  const { data } = await buildingImportEndpoints.downloadTemplate();
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'edificios-import-v1.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useBuildingImportJobsQuery(limit = 20) {
  return useQuery({
    queryKey: [...KEYS.jobs, limit],
    queryFn: async () => {
      const { data } = await buildingImportEndpoints.listJobs({ limit, offset: 0 });
      return data;
    },
  });
}

export function useBuildingImportPreviewQuery(
  jobId: string | null,
  params: BuildingImportRowsQueryParams = {},
) {
  return useQuery({
    queryKey: KEYS.rows(jobId ?? '', params),
    queryFn: async () => {
      const { data } = await buildingImportEndpoints.getRows(jobId!, params);
      return data;
    },
    enabled: !!jobId,
  });
}

export function useValidateBuildingImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<ValidateBuildingImportResponse> => {
      const { data } = await buildingImportEndpoints.validate(file);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.jobs });
    },
  });
}

export function useCommitBuildingImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string): Promise<CommitBuildingImportResponse> => {
      const { data } = await buildingImportEndpoints.commit(jobId);
      return data;
    },
    onSuccess: (_data, jobId) => {
      qc.invalidateQueries({ queryKey: KEYS.jobs });
      qc.invalidateQueries({ queryKey: KEYS.job(jobId) });
      qc.invalidateQueries({ queryKey: ['buildings'] });
    },
  });
}
