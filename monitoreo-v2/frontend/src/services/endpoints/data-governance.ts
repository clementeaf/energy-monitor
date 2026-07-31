import api from '../api';
import { API_ROUTES } from '../routes';
import type { DataQualityReportResponse, DataQualityReportParams } from '../../types/data-quality';
import type {
  BalanceAnomaly,
  BalanceAnomalyQueryParams,
  DataContract,
  DataSloBreach,
} from '../../types/data-governance';
import type { IngestGapListParams, IngestGapListResponse } from '../../types/ingest-gap';
import type { BackfillJob, CreateBackfillJobPayload } from '../../types/backfill-job';

export const dataQualityEndpoints = {
  report: (params: DataQualityReportParams) =>
    api.get<DataQualityReportResponse>(API_ROUTES.dataQualityReport, { params }),
  balanceAnomalies: (params?: BalanceAnomalyQueryParams) =>
    api.get<BalanceAnomaly[]>(API_ROUTES.dataQualityBalanceAnomalies, { params }),
  sloBreaches: (params?: { limit?: number }) =>
    api.get<DataSloBreach[]>(API_ROUTES.dataQualitySloBreaches, { params }),
  dataContracts: () =>
    api.get<DataContract[]>(API_ROUTES.dataQualityDataContracts),
};

export const ingestGapsEndpoints = {
  list: (params?: IngestGapListParams) =>
    api.get<IngestGapListResponse>(API_ROUTES.ingestGaps, { params }),
};

export const backfillJobsEndpoints = {
  list: () => api.get<BackfillJob[]>(API_ROUTES.backfillJobs),
  create: (payload: CreateBackfillJobPayload) =>
    api.post<BackfillJob>(API_ROUTES.backfillJobs, payload),
  process: (id: string) => api.post<BackfillJob>(API_ROUTES.backfillJobProcess(id)),
};
